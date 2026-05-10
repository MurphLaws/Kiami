import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ArrowLeft,
	CaretDown,
	Check,
	Copy,
	Export,
	LinkedinLogo,
	MagnifyingGlass,
	Phone,
	Spinner,
	Warning,
	X,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { FocusedHeader } from "@/components/kiami/focused-header";
import { KiamiMark } from "@/components/kiami/logo";
import {
	loadResult,
	useScheduleCall,
	type StoredLead,
	type StoredSearchResult,
} from "@/hooks/use-search";
import { useMode } from "@/components/kiami/flow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/results")({
	component: ResultsPage,
});

type ScheduleState = "idle" | "loading" | "error";

function ResultsPage() {
	const navigate = useNavigate();
	const { flow } = useMode();
	const scheduleCall = useScheduleCall();

	const [result, setResult] = useState<StoredSearchResult | null>(null);
	const [query, setQuery] = useState("");
	const [expanded, setExpanded] = useState<Set<number>>(new Set());
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [scheduleByIdx, setScheduleByIdx] = useState<
		Record<number, ScheduleState>
	>({});
	const [bulkLoading, setBulkLoading] = useState(false);

	useEffect(() => {
		const r = loadResult();
		if (!r) {
			void navigate({ to: "/new" });
			return;
		}
		setResult(r);
	}, [navigate]);

	const toggleExpand = useCallback((i: number) => {
		setExpanded((prev) => {
			const n = new Set(prev);
			n.has(i) ? n.delete(i) : n.add(i);
			return n;
		});
	}, []);

	const toggleSelect = useCallback((i: number) => {
		setSelected((prev) => {
			const n = new Set(prev);
			n.has(i) ? n.delete(i) : n.add(i);
			return n;
		});
	}, []);

	const setOne = useCallback((i: number, s: ScheduleState | undefined) => {
		setScheduleByIdx((m) => {
			const n = { ...m };
			if (!s) delete n[i];
			else n[i] = s;
			return n;
		});
	}, []);

	const scheduleOne = useCallback(
		async (idx: number) => {
			if (!result) return;
			const lead = result.leads[idx];
			setOne(idx, "loading");
			try {
				const res = await scheduleCall({
					full_name: lead.full_name,
					company: lead.company_name,
					company_domain: lead.company_domain,
					flow,
					tier: lead.high_profile ? "high" : "low",
				});
				const ok = (res as { ok?: boolean })?.ok !== false;
				const message = describeResponse(res);
				if (ok) {
					toast.success(`Call scheduled for ${lead.full_name}`, {
						description: message,
					});
					setOne(idx, undefined);
				} else {
					toast.error(`Couldn't schedule ${lead.full_name}`, {
						description: message,
					});
					setOne(idx, "error");
				}
			} catch (err) {
				toast.error(`Couldn't schedule ${lead.full_name}`, {
					description: err instanceof Error ? err.message : String(err),
				});
				setOne(idx, "error");
			}
		},
		[flow, result, scheduleCall, setOne],
	);

	const scheduleSelected = useCallback(async () => {
		if (!result) return;
		const targets = [...selected];
		if (targets.length === 0) return;
		setBulkLoading(true);
		setScheduleByIdx((m) => {
			const n = { ...m };
			for (const i of targets) n[i] = "loading";
			return n;
		});
		const results = await Promise.allSettled(
			targets.map((i) =>
				scheduleCall({
					full_name: result.leads[i].full_name,
					company: result.leads[i].company_name,
					company_domain: result.leads[i].company_domain,
					flow,
					tier: result.leads[i].high_profile ? "high" : "low",
				}).then((r) => ({ i, r })),
			),
		);
		let ok = 0;
		let fail = 0;
		setScheduleByIdx((m) => {
			const n = { ...m };
			for (const r of results) {
				if (r.status === "fulfilled") {
					const { i, r: payload } = r.value;
					const isOk = (payload as { ok?: boolean })?.ok !== false;
					if (isOk) {
						delete n[i];
						ok++;
					} else {
						n[i] = "error";
						fail++;
					}
				} else {
					fail++;
				}
			}
			return n;
		});
		setBulkLoading(false);
		setSelected(new Set());
		if (fail === 0) {
			toast.success(`Scheduled ${ok} call${ok === 1 ? "" : "s"}`);
		} else {
			toast.error(`Scheduled ${ok} of ${targets.length}; ${fail} failed`);
		}
	}, [flow, result, scheduleCall, selected]);

	const filtered = useMemo(() => {
		if (!result) return [] as Array<{ idx: number; lead: StoredLead }>;
		const q = query.trim().toLowerCase();
		const all = result.leads.map((lead, idx) => ({ idx, lead }));
		if (!q) return all;
		return all.filter(({ lead }) => {
			const hay = [
				lead.full_name,
				lead.job_title,
				lead.company_name,
				lead.company_industry,
				lead.location,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return hay.includes(q);
		});
	}, [result, query]);

	const strict = filtered.filter(
		({ lead }) => lead.match_strictness === "strict" || !lead.match_strictness,
	);
	const lax = filtered.filter(({ lead }) => lead.match_strictness === "lax");

	if (!result) return null;
	const fatal = classifyError(result);
	const totalLeads = result.leads.length;

	return (
		<div className="min-h-screen bg-paper text-ink">
			<FocusedHeader />

			<TopBar
				query={query}
				onQuery={setQuery}
				selectedCount={selected.size}
				totalCount={totalLeads}
				onClearSelection={() => setSelected(new Set())}
				onExport={() => exportCsv(result.leads, flow)}
			/>

			<div className="mx-auto max-w-[1200px] px-8 py-8">
				<div className="mb-6">
					<Link
						to="/new"
						className="inline-flex items-center gap-1.5 text-[13px] text-slate transition-colors hover:text-ink"
					>
						<ArrowLeft size={13} />
						Run another search
					</Link>
				</div>

				{fatal && <ErrorBanner fatal={fatal} />}

				{result.rationale && <Rationale text={result.rationale} />}

				{totalLeads === 0 ? (
					<EmptyState />
				) : (
					<>
						{strict.length > 0 && (
							<>
								<GroupHeader
									label="Strict matches"
									count={strict.length}
									description="Leads that satisfy every constraint in the brief."
								/>
								<div className="mb-10">
									{strict.map(({ idx, lead }) => (
										<ContactRow
											key={`s-${idx}`}
											lead={lead}
											expanded={expanded.has(idx)}
											selected={selected.has(idx)}
											scheduleState={scheduleByIdx[idx] ?? "idle"}
											onToggleExpand={() => toggleExpand(idx)}
											onToggleSelect={() => toggleSelect(idx)}
											onSchedule={() => scheduleOne(idx)}
										/>
									))}
								</div>
							</>
						)}

						{lax.length > 0 && (
							<>
								<GroupHeader
									label="Wider sweep"
									count={lax.length}
									description="Adjacent matches surfaced by the lax filter pass."
								/>
								<div className="mb-10">
									{lax.map(({ idx, lead }) => (
										<ContactRow
											key={`l-${idx}`}
											lead={lead}
											expanded={expanded.has(idx)}
											selected={selected.has(idx)}
											scheduleState={scheduleByIdx[idx] ?? "idle"}
											onToggleExpand={() => toggleExpand(idx)}
											onToggleSelect={() => toggleSelect(idx)}
											onSchedule={() => scheduleOne(idx)}
										/>
									))}
								</div>
							</>
						)}

						{strict.length === 0 && lax.length === 0 && query.trim() && (
							<NoMatches query={query} onClear={() => setQuery("")} />
						)}
					</>
				)}
			</div>

			<BulkActionBar
				count={selected.size}
				loading={bulkLoading}
				onCancel={() => setSelected(new Set())}
				onSchedule={scheduleSelected}
			/>
		</div>
	);
}

/* ---------- Top sticky bar ---------- */

function TopBar({
	query,
	onQuery,
	selectedCount,
	totalCount,
	onClearSelection,
	onExport,
}: {
	query: string;
	onQuery: (v: string) => void;
	selectedCount: number;
	totalCount: number;
	onClearSelection: () => void;
	onExport: () => void;
}) {
	return (
		<div className="sticky top-0 z-30 border-b border-hairline bg-paper/95 backdrop-blur-md">
			<div className="mx-auto flex max-w-[1200px] items-center gap-4 px-8 py-3">
				<div className="relative flex-1 max-w-[420px]">
					<MagnifyingGlass
						size={14}
						className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate"
					/>
					<input
						value={query}
						onChange={(e) => onQuery(e.target.value)}
						placeholder="Search by name, company, or title…"
						className="block w-full rounded-[4px] border border-hairline bg-paper py-2 pr-3 pl-9 text-[13px] text-ink outline-none transition-colors placeholder:text-slate focus:border-cobalt focus:ring-2 focus:ring-cobalt/15"
					/>
				</div>
				<div className="flex items-center gap-3 text-[13px]">
					<span className="eyebrow">{totalCount} contacts</span>
					{selectedCount > 0 && (
						<button
							type="button"
							onClick={onClearSelection}
							className="inline-flex items-center gap-1.5 rounded-[4px] bg-mist px-2.5 py-1 text-[12px] font-medium text-cobalt transition-colors hover:bg-mist/70"
						>
							{selectedCount} selected
							<X size={11} weight="bold" />
						</button>
					)}
				</div>
				<div className="ml-auto">
					<button
						type="button"
						onClick={onExport}
						className="inline-flex items-center gap-1.5 rounded-[4px] border border-hairline bg-paper px-3 py-1.5 text-[13px] text-ink transition-colors hover:bg-mist"
					>
						<Export size={13} />
						Export CSV
					</button>
				</div>
			</div>
		</div>
	);
}

/* ---------- Rationale + group header + error banner ---------- */

function Rationale({ text }: { text: string }) {
	return (
		<div className="mb-8 max-w-[680px]">
			<span className="eyebrow">Search rationale</span>
			<p className="mt-2 text-[15px] leading-snug text-ink">{text}</p>
		</div>
	);
}

function GroupHeader({
	label,
	count,
	description,
}: {
	label: string;
	count: number;
	description: string;
}) {
	return (
		<div className="mb-3 flex items-baseline justify-between border-t border-hairline pt-4">
			<div>
				<span className="eyebrow">{label}</span>
				<p className="mt-1 text-[13px] text-slate">{description}</p>
			</div>
			<span className="font-mono-display tnum text-[12px] text-slate">
				{String(count).padStart(2, "0")}
			</span>
		</div>
	);
}

function ErrorBanner({
	fatal,
}: {
	fatal: { title: string; body: string; hint?: string };
}) {
	return (
		<div
			role="alert"
			className="mb-6 flex items-start gap-3 rounded-[8px] border border-danger/25 bg-danger/5 p-4"
		>
			<Warning
				size={18}
				weight="fill"
				className="mt-0.5 shrink-0 text-danger"
				color="var(--danger)"
			/>
			<div className="flex-1">
				<div className="font-medium text-ink">{fatal.title}</div>
				<p className="mt-1 text-[14px] leading-snug text-slate">
					{fatal.body}
				</p>
				{fatal.hint && (
					<div className="mt-2 text-[12px] text-slate">{fatal.hint}</div>
				)}
			</div>
		</div>
	);
}

/* ---------- Contact row ---------- */

function ContactRow({
	lead,
	expanded,
	selected,
	scheduleState,
	onToggleExpand,
	onToggleSelect,
	onSchedule,
}: {
	lead: StoredLead;
	expanded: boolean;
	selected: boolean;
	scheduleState: ScheduleState;
	onToggleExpand: () => void;
	onToggleSelect: () => void;
	onSchedule: () => void;
}) {
	const initials = getInitials(lead.full_name);
	const tag = leadTag(lead);

	return (
		<div
			className={cn(
				"group relative border-b border-hairline transition-colors",
				selected ? "bg-mist" : "hover:bg-mist/60",
				selected &&
					"after:absolute after:inset-y-0 after:left-0 after:w-[2px] after:bg-cobalt",
			)}
			style={{ transition: "background-color var(--ease-state)" }}
		>
			<div className="grid grid-cols-[24px_28px_minmax(0,1fr)_minmax(0,1fr)_140px_140px_24px] items-center gap-4 px-4 py-3.5">
				{/* Select */}
				<button
					type="button"
					onClick={onToggleSelect}
					aria-label={selected ? "Deselect" : "Select"}
					className={cn(
						"grid h-4 w-4 place-items-center rounded-[2px] border transition-colors",
						selected
							? "border-cobalt bg-cobalt text-paper"
							: "border-hairline bg-paper text-paper opacity-0 group-hover:opacity-100",
					)}
				>
					{selected && <Check size={11} weight="bold" />}
				</button>

				{/* Avatar */}
				<div className="grid h-7 w-7 place-items-center rounded-full bg-mist text-[10px] font-semibold text-cobalt">
					{initials}
				</div>

				{/* Name + title */}
				<button
					type="button"
					onClick={onToggleExpand}
					className="min-w-0 text-left"
				>
					<div className="truncate text-[14px] font-medium text-ink">
						{lead.full_name}
					</div>
					<div className="mt-0.5 truncate text-[12px] text-slate">
						{lead.job_title ?? "—"}
					</div>
				</button>

				{/* Company + industry */}
				<button
					type="button"
					onClick={onToggleExpand}
					className="min-w-0 text-left"
				>
					<div className="truncate text-[14px] font-medium text-ink">
						{lead.company_name ?? "—"}
					</div>
					<div className="truncate text-[12px] text-slate">
						{lead.company_industry ?? lead.location ?? ""}
					</div>
				</button>

				{/* Classification tag */}
				<div>{tag && <ClassificationTag tag={tag} />}</div>

				{/* Schedule */}
				<div>
					<ScheduleButton state={scheduleState} onClick={onSchedule} />
				</div>

				{/* Caret */}
				<button
					type="button"
					onClick={onToggleExpand}
					aria-label={expanded ? "Collapse" : "Expand"}
					className="grid h-7 w-7 place-items-center rounded-full text-slate transition-colors hover:bg-mist hover:text-ink"
				>
					<CaretDown
						size={12}
						weight="bold"
						className="transition-transform"
						style={{
							transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
							transitionDuration: "150ms",
							transitionTimingFunction: "ease-out",
						}}
					/>
				</button>
			</div>

			{expanded && <FoldedDetails lead={lead} />}
		</div>
	);
}

/* ---------- Folded details ---------- */

function FoldedDetails({ lead }: { lead: StoredLead }) {
	const [copied, setCopied] = useState(false);
	const copyOpener = async () => {
		const opener = lead.brief?.suggested_opener;
		if (!opener) return;
		try {
			await navigator.clipboard.writeText(opener);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {}
	};

	const signals: Array<[string, string | null]> = [
		["Industry", lead.company_industry ?? null],
		[
			"Headcount",
			lead.company_headcount != null ? String(lead.company_headcount) : null,
		],
		["Location", lead.location ?? null],
		["Seniority", lead.seniority ?? null],
		["Domain", lead.company_domain ?? null],
		[
			"Source",
			lead.source === "bettercontact" ? "Primary index" : "Wider sweep",
		],
	];
	const filledSignals = signals.filter(([, v]) => v && String(v).trim());

	return (
		<div className="kiami-row-expand border-t border-hairline bg-paper px-4 py-7 pl-[64px]">
			{lead.brief && (
				<div className="mb-7 max-w-[760px] border-l-[3px] border-cobalt bg-mist/70 p-5">
					<span className="eyebrow">Why they fit</span>
					<p className="mt-2 text-[14px] leading-relaxed text-ink">
						{lead.brief.why_they_fit}
					</p>
					{lead.brief.suggested_opener && (
						<div className="mt-4">
							<div className="mb-1.5 flex items-center justify-between">
								<span className="eyebrow">Suggested opener</span>
								<button
									type="button"
									onClick={copyOpener}
									className="inline-flex items-center gap-1 font-mono-display text-[10px] tracking-[0.18em] text-slate uppercase transition-colors hover:text-cobalt"
								>
									{copied ? (
										<>
											<Check size={10} weight="bold" />
											Copied
										</>
									) : (
										<>
											<Copy size={10} weight="bold" />
											Copy
										</>
									)}
								</button>
							</div>
							<p
								className="border-l border-cobalt/30 pl-3 text-[14px] leading-relaxed text-ink"
								style={{ fontStyle: "italic" }}
							>
								"{lead.brief.suggested_opener}"
							</p>
						</div>
					)}
				</div>
			)}

			<div className="grid max-w-[760px] grid-cols-2 gap-x-8 md:grid-cols-3">
				{filledSignals.map(([k, v]) => {
					const isNumeric = /^[\d.,\s]+$/.test(String(v));
					return (
						<div key={k} className="border-t border-hairline py-3">
							<span className="eyebrow">{k}</span>
							<div
								className={cn(
									"mt-1 text-[13px] text-ink",
									isNumeric && "font-mono-display tnum",
								)}
							>
								{v}
							</div>
						</div>
					);
				})}
				{lead.classification && (
					<ClassificationCell classification={lead.classification} />
				)}
			</div>

			{lead.linkedin_url && (
				<div className="mt-5 max-w-[760px]">
					<a
						href={lead.linkedin_url}
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-1.5 text-[12px] text-cobalt transition-colors hover:text-deep"
					>
						<LinkedinLogo size={12} weight="fill" />
						Open LinkedIn profile
					</a>
				</div>
			)}
		</div>
	);
}

function ClassificationCell({
	classification,
}: {
	classification: NonNullable<StoredLead["classification"]>;
}) {
	let label = "";
	let value = "";
	let highlight = false;
	if (classification.kind === "lead") {
		label = "Tier";
		value = classification.tier;
		highlight = classification.tier === "hot";
	} else {
		label = "Recommendation";
		value = classification.recommendation;
		highlight = classification.recommendation === "shortlist";
	}
	return (
		<div className="border-t border-hairline py-3">
			<span className="eyebrow">{label}</span>
			<div className="mt-1 flex items-center gap-2 text-[13px] text-ink">
				{highlight && (
					<span className="inline-block h-1.5 w-1.5 rounded-full bg-sky" />
				)}
				<span className="capitalize">{value}</span>
			</div>
			{classification.reasoning && (
				<p className="mt-1 text-[12px] leading-snug text-slate">
					{classification.reasoning}
				</p>
			)}
		</div>
	);
}

/* ---------- Classification chip in row ---------- */

type Tag = { label: string; tone: "hot" | "warm" | "cold" | "neutral" };

function leadTag(lead: StoredLead): Tag | null {
	if (!lead.classification) {
		return lead.high_profile ? { label: "High profile", tone: "warm" } : null;
	}
	if (lead.classification.kind === "lead") {
		return {
			label: lead.classification.tier,
			tone: lead.classification.tier,
		};
	}
	const rec = lead.classification.recommendation;
	const tone: Tag["tone"] =
		rec === "shortlist" ? "hot" : rec === "screen" ? "warm" : "cold";
	return { label: rec, tone };
}

function ClassificationTag({ tag }: { tag: Tag }) {
	const dotColor =
		tag.tone === "hot"
			? "var(--cobalt)"
			: tag.tone === "warm"
				? "var(--sky)"
				: "var(--hairline)";
	return (
		<div className="inline-flex items-center gap-2 text-[12px] text-slate">
			<span
				className="inline-block h-1.5 w-1.5 rounded-full"
				style={{ background: dotColor }}
			/>
			<span className="capitalize">{tag.label}</span>
		</div>
	);
}

/* ---------- Schedule button (idle / loading-green / error) ---------- */

function ScheduleButton({
	state,
	onClick,
}: {
	state: ScheduleState;
	onClick: () => void;
}) {
	const loading = state === "loading";
	const error = state === "error";
	return (
		<div className="relative inline-flex">
			{loading && (
				<span
					aria-hidden
					className="kiami-call-pulse pointer-events-none absolute inset-0 rounded-[4px]"
				/>
			)}
			<button
				type="button"
				disabled={loading}
				onClick={onClick}
				className={cn(
					"relative z-10 inline-flex h-8 min-w-[124px] items-center justify-center gap-1.5 rounded-[4px] px-3 text-[12px] font-medium transition-colors",
					!loading &&
						!error &&
						"border border-cobalt bg-paper text-cobalt hover:bg-mist",
					loading && "border border-[#1F8A5B] bg-[#1F8A5B] text-paper",
					error && "border border-danger bg-paper text-danger",
				)}
			>
				{loading ? (
					<>
						<Spinner size={11} className="animate-spin" />
						Scheduling…
					</>
				) : error ? (
					<>
						<Warning size={11} weight="fill" />
						Retry
					</>
				) : (
					<>
						<Phone size={11} weight="bold" />
						Schedule call
					</>
				)}
			</button>
		</div>
	);
}

/* ---------- Bulk action bar ---------- */

function BulkActionBar({
	count,
	loading,
	onCancel,
	onSchedule,
}: {
	count: number;
	loading: boolean;
	onCancel: () => void;
	onSchedule: () => void;
}) {
	if (count === 0) return null;
	return (
		<div
			className="kiami-fade-up fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-[10px] bg-ink px-4 py-3 shadow-lg"
			style={{ boxShadow: "var(--shadow-md)" }}
		>
			<span className="font-mono-display text-[11px] tracking-[0.18em] text-paper/70 uppercase">
				{count} selected
			</span>
			<span className="h-4 w-px bg-paper/15" />
			<button
				type="button"
				disabled={loading}
				onClick={onSchedule}
				className={cn(
					"inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[12px] font-medium transition-colors",
					loading
						? "bg-[#1F8A5B] text-paper"
						: "bg-paper text-ink hover:bg-mist",
				)}
			>
				{loading ? (
					<>
						<Spinner size={11} className="animate-spin" />
						Scheduling…
					</>
				) : (
					<>
						<Phone size={11} weight="bold" />
						Schedule {count} call{count === 1 ? "" : "s"}
					</>
				)}
			</button>
			<button
				type="button"
				onClick={onCancel}
				className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
				aria-label="Clear selection"
			>
				<X size={12} weight="bold" />
			</button>
		</div>
	);
}

/* ---------- Empty + no-match states ---------- */

function EmptyState() {
	return (
		<div className="grid place-items-center py-20 text-center">
			<div style={{ color: "var(--cobalt)" }}>
				<KiamiMark size={96} />
			</div>
			<h2
				className="mt-6 text-ink"
				style={{ fontSize: "var(--type-h1)", fontWeight: 700, letterSpacing: "-0.02em" }}
			>
				No contacts yet
			</h2>
			<p className="mt-2 max-w-[420px] text-[15px] text-slate">
				Kiami needs a brief to find people. Describe who you're looking for in
				plain English and we'll do the rest.
			</p>
			<Link
				to="/new"
				className="mt-6 inline-flex items-center gap-1.5 rounded-[4px] bg-cobalt px-5 py-2.5 text-[13px] font-medium text-paper transition-colors hover:bg-deep"
			>
				Run a search
			</Link>
		</div>
	);
}

function NoMatches({ query, onClear }: { query: string; onClear: () => void }) {
	return (
		<div className="border-t border-hairline py-12 text-center">
			<p className="text-[14px] text-slate">
				No contacts match "<span className="text-ink">{query}</span>".
			</p>
			<button
				type="button"
				onClick={onClear}
				className="mt-2 inline-flex items-center gap-1.5 font-mono-display text-[11px] tracking-[0.18em] text-cobalt uppercase transition-colors hover:text-deep"
			>
				Clear search
			</button>
		</div>
	);
}

/* ---------- Helpers ---------- */

function getInitials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((s) => s[0]?.toUpperCase() ?? "")
		.join("");
}

function describeResponse(res: unknown): string {
	const r = res as { status?: number; body?: unknown; ms?: number };
	const ms = typeof r.ms === "number" ? `${r.ms}ms` : "";
	const status = r.status ? `${r.status}` : "";
	let body = "";
	if (typeof r.body === "string") body = r.body;
	else if (r.body && typeof r.body === "object") {
		const obj = r.body as Record<string, unknown>;
		body = String(
			obj.message ?? obj.body ?? obj.error ?? obj.detail ?? JSON.stringify(obj),
		);
	}
	return [body, status, ms].filter(Boolean).join(" · ");
}

function exportCsv(
	leads: StoredSearchResult["leads"],
	flow: "recruiting" | "sales",
) {
	if (typeof window === "undefined") return;
	const headers = [
		"source",
		"high_profile",
		"match_strictness",
		"full_name",
		"job_title",
		"seniority",
		"location",
		"company_name",
		"company_industry",
		"company_domain",
		"linkedin_url",
		"why_they_fit",
		"suggested_opener",
	];
	const rows = leads.map((l) => {
		const sourceLabel = l.source === "bettercontact" ? "primary" : "network";
		return headers
			.map((h) => {
				if (h === "source") return csvCell(sourceLabel);
				if (h === "high_profile") return csvCell(l.high_profile ? "yes" : "");
				if (h === "match_strictness") return csvCell(l.match_strictness ?? "");
				if (h === "why_they_fit") return csvCell(l.brief?.why_they_fit ?? "");
				if (h === "suggested_opener")
					return csvCell(l.brief?.suggested_opener ?? "");
				return csvCell((l as Record<string, unknown>)[h]);
			})
			.join(",");
	});
	const csv = [headers.join(","), ...rows].join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	const file = flow === "sales" ? "leads" : "candidates";
	a.download = `kiami-${file}-${new Date().toISOString().slice(0, 19)}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

function csvCell(v: unknown): string {
	if (v === null || v === undefined) return "";
	const s = String(v);
	if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
}

function classifyError(
	r: StoredSearchResult,
): { title: string; body: string; hint?: string } | null {
	const bcErr = r.bc.error ?? "";
	const apolloErr = r.apollo.error ?? "";
	const total = r.leads.length;

	const outOfCredits = /402|tokens|credits|insufficient|not enough/i.test(bcErr);
	const apolloPlanIssue = /403|api_key on a free plan|inaccessible/i.test(
		apolloErr,
	);

	if (outOfCredits) {
		return {
			title: "Primary index is out of credits",
			body:
				"BetterContact returned an account-level error: the search couldn't run because the workspace ran out of credits.",
			hint: "Top up the BetterContact plan to resume searches. The wider sweep alone won't return contacts while the primary index is unreachable.",
		};
	}
	if (bcErr && /401|403|unauthor/i.test(bcErr)) {
		return {
			title: "Primary index credentials rejected",
			body: "BetterContact returned a 401/403. Check the API key and account status.",
		};
	}
	if (bcErr && /429/i.test(bcErr)) {
		return {
			title: "Rate-limited",
			body: "Too many searches in the last minute. Wait ~60 seconds and retry.",
		};
	}
	if (total === 0 && bcErr) {
		return { title: "Search couldn't complete", body: bcErr };
	}
	if (total === 0 && apolloPlanIssue && (r.bc.leads_found ?? 0) === 0) {
		return {
			title: "No matches",
			body:
				"The primary index returned no matches and the wider sweep is gated behind a paid plan, so nothing came back.",
			hint: "Try widening the brief — fewer must-haves, broader geography, or a more common job title.",
		};
	}
	return null;
}
