import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
	ArrowLeft,
	CaretDown,
	Check,
	Copy,
	Export,
	LinkedinLogo,
	Phone,
	Sparkle,
	Spinner,
	Star,
	Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FocusedHeader } from "@/components/kiami/focused-header";
import { personNoun, useMode } from "@/components/kiami/flow";
import {
	loadResult,
	useScheduleCall,
	type StoredLead,
	type StoredSearchResult,
} from "@/hooks/use-search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/results")({
	component: ResultsPage,
});

type SourceFilter = "all" | "primary" | "network" | "high";
type ScheduleState = "idle" | "loading" | "error";

function ResultsPage() {
	const navigate = useNavigate();
	const { flow } = useMode();
	const scheduleCall = useScheduleCall();

	const [result, setResult] = useState<StoredSearchResult | null>(null);
	const [filter, setFilter] = useState<SourceFilter>("all");
	const [expanded, setExpanded] = useState<Set<number>>(new Set());
	const [scheduleByIdx, setScheduleByIdx] = useState<
		Record<number, ScheduleState>
	>({});
	const [globalState, setGlobalState] = useState<ScheduleState>("idle");

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

	const scheduleOne = useCallback(
		async (idx: number) => {
			if (!result) return;
			const lead = result.leads[idx];
			setScheduleByIdx((m) => ({ ...m, [idx]: "loading" }));
			const clear = () =>
				setScheduleByIdx((m) => {
					const n = { ...m };
					delete n[idx];
					return n;
				});
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
					clear();
				} else {
					toast.error(`Couldn't schedule ${lead.full_name}`, {
						description: message,
					});
					setScheduleByIdx((m) => ({ ...m, [idx]: "error" }));
				}
			} catch (err) {
				toast.error(`Couldn't schedule ${lead.full_name}`, {
					description: err instanceof Error ? err.message : String(err),
				});
				setScheduleByIdx((m) => ({ ...m, [idx]: "error" }));
			}
		},
		[flow, result, scheduleCall],
	);

	const scheduleAll = useCallback(async () => {
		if (!result) return;
		const lowIdx = result.leads
			.map((_, i) => i)
			.filter((i) => !result.leads[i].high_profile);
		if (lowIdx.length === 0) return;

		setGlobalState("loading");
		// Mark every targeted row as loading too.
		setScheduleByIdx((m) => {
			const n = { ...m };
			for (const i of lowIdx) n[i] = "loading";
			return n;
		});

		const results = await Promise.allSettled(
			lowIdx.map((i) =>
				scheduleCall({
					full_name: result.leads[i].full_name,
					company: result.leads[i].company_name,
					company_domain: result.leads[i].company_domain,
					flow,
					tier: "low",
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

		if (fail === 0) {
			toast.success(`Scheduled ${ok} call${ok === 1 ? "" : "s"}`);
			setGlobalState("idle");
		} else {
			toast.error(`Scheduled ${ok} of ${lowIdx.length}; ${fail} failed`);
			setGlobalState("error");
		}
	}, [flow, result, scheduleCall]);

	if (!result) return null;

	const peoplePlural = personNoun(flow, true);
	const peopleSingular = personNoun(flow, false);

	const visibleIdx = result.leads
		.map((_, i) => i)
		.filter((i) => {
			const l = result.leads[i];
			if (filter === "all") return true;
			if (filter === "high") return !!l.high_profile;
			if (filter === "primary") return l.source === "bettercontact";
			if (filter === "network") return l.source === "apollo";
			return true;
		});

	const primaryCount = result.leads.filter(
		(l) => l.source === "bettercontact",
	).length;
	const networkCount = result.leads.filter(
		(l) => l.source === "apollo",
	).length;
	const highCount = result.leads.filter((l) => l.high_profile).length;
	const lowCount = result.leads.length - highCount;

	const fatal = classifyError(result);

	return (
		<div className="min-h-screen bg-muted">
			<FocusedHeader />
			<div className="mx-auto max-w-[1200px] px-8 pt-8 pb-16">
				<div className="mb-6">
					<Link
						to="/new"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft size={14} />
						Run another search
					</Link>
				</div>

				{fatal && (
					<div
						className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
						role="alert"
					>
						<Warning
							size={18}
							weight="fill"
							className="mt-0.5 shrink-0 text-destructive"
						/>
						<div className="flex-1">
							<div className="font-medium text-foreground">{fatal.title}</div>
							<p className="mt-1 text-[14px] leading-snug text-muted-foreground">
								{fatal.body}
							</p>
							{fatal.hint && (
								<div className="mt-2 text-[12px] text-muted-foreground">
									{fatal.hint}
								</div>
							)}
						</div>
					</div>
				)}

				<div className="mb-7 flex flex-wrap items-start justify-between gap-4">
					<div>
						<span className="text-[12px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
							Results
						</span>
						<h1 className="mt-1.5 font-heading text-[36px] font-semibold leading-tight tracking-tight">
							{result.leads.length}{" "}
							{result.leads.length === 1 ? peopleSingular : peoplePlural} found
						</h1>
						{result.rationale && (
							<p className="mt-2 max-w-[640px] text-[15px] text-muted-foreground">
								<Sparkle
									size={13}
									weight="fill"
									color="var(--color-brand)"
									className="mr-1.5 inline-block"
								/>
								{result.rationale}
							</p>
						)}
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<GlobalScheduleButton
							state={globalState}
							lowCount={lowCount}
							onClick={scheduleAll}
						/>
						<Button
							variant="outline"
							className="gap-1.5"
							onClick={() => exportCsv(result.leads, flow)}
							disabled={result.leads.length === 0}
						>
							<Export size={14} />
							Export CSV
						</Button>
					</div>
				</div>

				<div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
					<StatCard
						label="Primary index"
						count={primaryCount}
						sub={
							primaryCount > 0
								? `${primaryCount} matched directly`
								: "no direct matches"
						}
						accent="var(--color-peach-icon)"
					/>
					<StatCard
						label="Wider sweep"
						count={networkCount}
						sub={
							networkCount > 0
								? `${networkCount} from secondary sources`
								: "not needed"
						}
						accent="var(--color-coral-icon)"
					/>
					<StatCard
						label="High profile"
						count={highCount}
						sub={
							highCount > 0
								? `${highCount} flagged for outreach`
								: "no standouts"
						}
						accent="var(--color-brand)"
					/>
				</div>

				<div className="mb-3 flex flex-wrap items-center gap-1.5">
					{(
						[
							["all", "All", result.leads.length],
							["high", "High profile", highCount],
							["primary", "Primary", primaryCount],
							["network", "Wider sweep", networkCount],
						] as const
					).map(([id, label, n]) => {
						const active = filter === id;
						return (
							<button
								type="button"
								key={id}
								onClick={() => setFilter(id)}
								className={cn(
									"inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
									active
										? "bg-card font-medium text-foreground shadow-xs"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{label}
								<span
									className={cn(
										"min-w-5 rounded px-1.5 text-center text-[11px]",
										active ? "border bg-card" : "text-muted-foreground",
									)}
								>
									{n}
								</span>
							</button>
						);
					})}
				</div>

				<Card className="overflow-hidden bg-card p-0">
					{visibleIdx.length === 0 ? (
						<div className="px-8 py-14 text-center">
							<div className="font-heading text-[22px] font-semibold tracking-tight">
								No matching {peoplePlural}
							</div>
							<p className="mx-auto mt-2 max-w-[420px] text-[14px] text-muted-foreground">
								Try widening your brief — fewer must-haves, broader geography,
								or a more common job title.
							</p>
							<Link
								to="/new"
								className={cn(
									buttonVariants({ variant: "outline" }),
									"mt-5 gap-1.5",
								)}
							>
								<ArrowLeft size={14} />
								Tweak the brief
							</Link>
						</div>
					) : (
						<>
							{visibleIdx.map((idx) => {
								const l = result.leads[idx];
								const isOpen = expanded.has(idx);
								const sched = scheduleByIdx[idx] ?? "idle";
								return (
									<EditorialRow
										key={`${l.source}-${l.linkedin_url ?? l.full_name}-${idx}`}
										lead={l}
										expanded={isOpen}
										scheduleState={sched}
										onToggle={() => toggleExpand(idx)}
										onSchedule={() => scheduleOne(idx)}
									/>
								);
							})}
						</>
					)}
				</Card>
			</div>
		</div>
	);
}

function StatCard({
	label,
	count,
	sub,
	accent,
}: {
	label: string;
	count: number;
	sub: string;
	accent: string;
}) {
	return (
		<Card className="p-4">
			<div className="flex items-center gap-2">
				<span
					className="h-2 w-2 rounded-sm"
					style={{ background: accent }}
				/>
				<span className="text-[12px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
					{label}
				</span>
			</div>
			<div className="mt-2 font-heading text-[28px] font-semibold leading-none tracking-tight">
				{count}
			</div>
			<div className="mt-1.5 text-[12px] text-muted-foreground">{sub}</div>
		</Card>
	);
}

function SourceBadge({ source }: { source: "bettercontact" | "apollo" }) {
	const isPrimary = source === "bettercontact";
	const label = isPrimary ? "Primary" : "Wider sweep";
	return (
		<Badge
			variant="secondary"
			className="gap-1.5 py-1"
			style={{
				background: isPrimary
					? "var(--color-peach-tint)"
					: "var(--color-coral-tint)",
				color: isPrimary
					? "var(--color-peach-icon)"
					: "var(--color-coral-icon)",
			}}
		>
			<span
				className="h-1.5 w-1.5 rounded-full"
				style={{
					background: isPrimary
						? "var(--color-peach-icon)"
						: "var(--color-coral-icon)",
				}}
			/>
			{label}
		</Badge>
	);
}

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
					className="kiami-call-pulse pointer-events-none absolute inset-0 rounded-md"
				/>
			)}
			<Button
				size="sm"
				variant="outline"
				disabled={loading}
				onClick={onClick}
				className={cn(
					"relative z-10 min-w-[130px] gap-1.5 transition-colors",
					loading &&
						"!bg-[#22A06B] !text-white hover:!bg-[#22A06B] !border-[#22A06B] disabled:opacity-100",
					error && "!border-destructive !text-destructive",
				)}
			>
				{loading ? (
					<>
						<Spinner size={12} className="animate-spin" />
						Scheduling…
					</>
				) : (
					<>
						<Phone size={12} weight="bold" />
						Schedule call
					</>
				)}
			</Button>
		</div>
	);
}

function GlobalScheduleButton({
	state,
	lowCount,
	onClick,
}: {
	state: ScheduleState;
	lowCount: number;
	onClick: () => void;
}) {
	const loading = state === "loading";
	const error = state === "error";
	if (lowCount === 0) return null;
	return (
		<Button
			size="default"
			variant="outline"
			disabled={loading}
			onClick={onClick}
			className={cn(
				"gap-1.5 transition-colors",
				loading &&
					"!bg-[#22A06B] !text-white hover:!bg-[#22A06B] !border-[#22A06B] disabled:opacity-100",
				error && "!border-destructive !text-destructive",
			)}
		>
			{loading ? (
				<>
					<Spinner size={14} className="animate-spin" />
					Scheduling {lowCount}…
				</>
			) : (
				<>
					<Phone size={14} weight="bold" />
					Schedule {lowCount} call{lowCount === 1 ? "" : "s"}
				</>
			)}
		</Button>
	);
}

function EditorialRow({
	lead,
	expanded,
	scheduleState,
	onToggle,
	onSchedule,
}: {
	lead: StoredLead;
	expanded: boolean;
	scheduleState: ScheduleState;
	onToggle: () => void;
	onSchedule: () => void;
}) {
	const isHigh = !!lead.high_profile;
	const initials = (lead.full_name ?? "")
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((s) => s[0]?.toUpperCase() ?? "")
		.join("");
	const tag = leadRowTag(lead);
	return (
		<div className="border-b last:border-b-0">
			<div className="grid grid-cols-[36px_minmax(0,1.4fr)_minmax(0,1fr)_140px_150px_28px] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
				{/* Avatar */}
				<button
					type="button"
					onClick={onToggle}
					aria-label={expanded ? "Collapse" : "Expand"}
					className="grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold transition-colors"
					style={{
						background: "var(--color-brand-tint)",
						color: "var(--color-brand)",
					}}
				>
					{initials || "·"}
				</button>

				{/* Name + title */}
				<button
					type="button"
					onClick={onToggle}
					className="min-w-0 text-left"
				>
					<div className="flex items-center gap-2">
						<span className="truncate font-medium text-foreground">
							{lead.full_name}
						</span>
						{isHigh && (
							<span
								className="inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-medium"
								style={{
									background: "var(--color-brand-tint)",
									color: "var(--color-brand)",
								}}
							>
								<Star size={9} weight="fill" />
								High
							</span>
						)}
					</div>
					<div className="mt-0.5 truncate text-[12px] text-muted-foreground">
						{[lead.job_title, lead.seniority]
							.filter(Boolean)
							.join(" · ") || "—"}
					</div>
				</button>

				{/* Company */}
				<button
					type="button"
					onClick={onToggle}
					className="min-w-0 text-left"
				>
					<div className="truncate text-[13px] text-foreground">
						{lead.company_name ?? "—"}
					</div>
					<div className="truncate text-[11px] text-muted-foreground">
						{lead.company_industry ?? lead.location ?? ""}
					</div>
				</button>

				{/* Classification dot + tag */}
				<div>{tag && <RowTag tag={tag} />}</div>

				{/* Schedule */}
				<div>
					<ScheduleButton state={scheduleState} onClick={onSchedule} />
				</div>

				{/* Caret */}
				<button
					type="button"
					onClick={onToggle}
					aria-label={expanded ? "Collapse" : "Expand"}
					className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					<CaretDown
						size={12}
						weight="bold"
						className="transition-transform duration-150"
						style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
					/>
				</button>
			</div>

			{expanded && <FoldedDetails lead={lead} />}
		</div>
	);
}

type RowTagShape = { label: string; tone: "hot" | "warm" | "cold" | "neutral" };

function leadRowTag(lead: StoredLead): RowTagShape | null {
	if (!lead.classification) {
		if (lead.match_strictness === "strict") {
			return { label: "Strict match", tone: "warm" };
		}
		if (lead.match_strictness === "lax") {
			return { label: "Adjacent fit", tone: "neutral" };
		}
		return lead.source === "bettercontact"
			? { label: "Primary", tone: "warm" }
			: { label: "Wider sweep", tone: "neutral" };
	}
	if (lead.classification.kind === "lead") {
		return { label: lead.classification.tier, tone: lead.classification.tier };
	}
	const rec = lead.classification.recommendation;
	const tone: RowTagShape["tone"] =
		rec === "shortlist" ? "hot" : rec === "screen" ? "warm" : "cold";
	return { label: rec, tone };
}

function RowTag({ tag }: { tag: RowTagShape }) {
	const dot =
		tag.tone === "hot"
			? "var(--color-brand)"
			: tag.tone === "warm"
				? "#9DC2FF"
				: tag.tone === "cold"
					? "var(--color-border-strong)"
					: "var(--color-border-strong)";
	return (
		<div className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
			<span
				className="inline-block h-1.5 w-1.5 rounded-full"
				style={{ background: dot }}
			/>
			<span className="capitalize">{tag.label}</span>
		</div>
	);
}

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
	const filled = signals.filter(([, v]) => v && String(v).trim());

	return (
		<div className="kiami-row-expand bg-muted/30 px-4 py-7 pl-[64px]">
			{lead.brief && (
				<div
					className="mb-7 max-w-[760px] border-l-[3px] p-5"
					style={{
						borderColor: "var(--color-brand)",
						background: "var(--color-brand-tint)",
					}}
				>
					<span className="eyebrow">Why they fit</span>
					<p className="mt-2 text-[14px] leading-relaxed text-foreground">
						{lead.brief.why_they_fit}
					</p>
					{lead.brief.suggested_opener && (
						<div className="mt-4">
							<div className="mb-1.5 flex items-center justify-between">
								<span className="eyebrow">Suggested opener</span>
								<button
									type="button"
									onClick={copyOpener}
									className="inline-flex items-center gap-1 font-mono-display text-[10px] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground"
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
								className="border-l pl-3 text-[14px] leading-relaxed text-foreground"
								style={{
									borderColor: "color-mix(in srgb, var(--color-brand) 30%, transparent)",
									fontStyle: "italic",
								}}
							>
								"{lead.brief.suggested_opener}"
							</p>
						</div>
					)}
				</div>
			)}

			<div className="grid max-w-[760px] grid-cols-2 gap-x-8 md:grid-cols-3">
				{filled.map(([k, v]) => {
					const isNumeric = /^[\d.,\s]+$/.test(String(v));
					return (
						<div key={k} className="border-t py-3">
							<span className="eyebrow">{k}</span>
							<div
								className={cn(
									"mt-1 text-[13px] text-foreground",
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
						className="inline-flex items-center gap-1.5 text-[12px] transition-colors"
						style={{ color: "var(--color-brand)" }}
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
		<div className="border-t py-3">
			<span className="eyebrow">{label}</span>
			<div className="mt-1 flex items-center gap-2 text-[13px] text-foreground">
				{highlight && (
					<span
						className="inline-block h-1.5 w-1.5 rounded-full"
						style={{ background: "#9DC2FF" }}
					/>
				)}
				<span className="capitalize">{value}</span>
			</div>
			{classification.reasoning && (
				<p className="mt-1 text-[12px] leading-snug text-muted-foreground">
					{classification.reasoning}
				</p>
			)}
		</div>
	);
}

function renderValue(v: unknown): string {
	if (v === null || v === undefined) return "—";
	if (typeof v === "string") return v;
	if (typeof v === "number" || typeof v === "boolean") return String(v);
	if (Array.isArray(v)) return v.map(renderValue).join(", ");
	if (typeof v === "object") {
		try {
			return JSON.stringify(v);
		} catch {
			return "[object]";
		}
	}
	return String(v);
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

	const outOfCredits =
		/402|tokens|credits|insufficient|not enough/i.test(bcErr);
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
		return {
			title: "Search couldn't complete",
			body: bcErr,
		};
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
