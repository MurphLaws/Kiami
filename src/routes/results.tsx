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

import { Button, buttonVariants } from "@/components/ui/button";
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
type ScheduleState = "idle" | "loading" | "scheduled" | "error";

/* Animates a number from 0 → `value` over 600ms when it first mounts.
   No deps; cleanup safe. Falls back to the value if reduced-motion is
   the user preference. */
function CountUp({
	value,
	className,
}: {
	value: number;
	className?: string;
}) {
	const [n, setN] = useState(0);
	useEffect(() => {
		if (typeof window === "undefined") {
			setN(value);
			return;
		}
		const reduce = window.matchMedia?.(
			"(prefers-reduced-motion: reduce)",
		)?.matches;
		if (reduce || value === 0) {
			setN(value);
			return;
		}
		const start = performance.now();
		const dur = 600;
		let raf = 0;
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / dur);
			const eased = 1 - Math.pow(1 - t, 3);
			setN(Math.round(eased * value));
			if (t < 1) raf = window.requestAnimationFrame(tick);
		};
		raf = window.requestAnimationFrame(tick);
		return () => window.cancelAnimationFrame(raf);
	}, [value]);
	return <span className={className}>{n}</span>;
}

function ResultsPage() {
	const navigate = useNavigate();
	const { flow } = useMode();
	const scheduleCall = useScheduleCall();

	const [result, setResult] = useState<StoredSearchResult | null>(null);
	const [filter, setFilter] = useState<SourceFilter>("all");
	const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
	const [expanded, setExpanded] = useState<Set<number>>(new Set());

	const toggleTag = useCallback((tag: string) => {
		setActiveTags((prev) => {
			const n = new Set(prev);
			n.has(tag) ? n.delete(tag) : n.add(tag);
			return n;
		});
	}, []);
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
			try {
				const res = await scheduleCall({
					full_name: lead.full_name,
					company: lead.company_name,
					company_domain: lead.company_domain,
					flow,
					tier: lead.high_profile ? "high" : "low",
					// Pinned leads carry a real phone we want the
					// webhook to dial; everyone else falls through to
					// the env-level test phone.
					...(lead.pinned && lead.phone ? { phone: lead.phone } : {}),
				});
				const ok = (res as { ok?: boolean })?.ok !== false;
				const message = describeResponse(res);
				if (ok) {
					toast.success(`Call scheduled for ${lead.full_name}`, {
						description: message,
					});
					// Hold the row at the green "scheduled" state so the
					// user has a visible record of which leads they've
					// already booked. It never reverts on its own.
					setScheduleByIdx((m) => ({ ...m, [idx]: "scheduled" }));
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
						n[i] = "scheduled";
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
			setGlobalState("scheduled");
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
			if (filter === "high" && !l.high_profile) return false;
			if (filter === "primary" && l.source !== "bettercontact") return false;
			if (filter === "network" && l.source !== "apollo") return false;
			// Tag filtering is AND — every active tag must be present.
			if (activeTags.size > 0) {
				const tags = new Set(l.tags ?? []);
				for (const t of activeTags) if (!tags.has(t)) return false;
			}
			return true;
		});

	// Aggregate the universe of tags surfaced across all returned leads,
	// sorted by frequency so the most common ones appear first.
	const tagCounts = new Map<string, number>();
	for (const l of result.leads) {
		for (const t of l.tags ?? []) {
			tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
		}
	}
	const allTags = Array.from(tagCounts.entries())
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.map(([t]) => t);

	const primaryCount = result.leads.filter(
		(l) => l.source === "bettercontact",
	).length;
	const networkCount = result.leads.filter(
		(l) => l.source === "apollo",
	).length;
	const highCount = result.leads.filter((l) => l.high_profile).length;
	const lowCount = result.leads.length - highCount;

	const fatal = classifyError(result);

	const filters: Array<[SourceFilter, string, number]> = [
		["all", "All", result.leads.length],
		["high", "High profile", highCount],
		["primary", "Primary", primaryCount],
		["network", "Wider sweep", networkCount],
	];

	return (
		<div className="min-h-screen bg-paper">
			<FocusedHeader />
			<div className="mx-auto max-w-[1200px] px-8 pt-8 pb-16">
				<div className="mb-7">
					<Link
						to="/new"
						className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
					>
						<ArrowLeft size={13} />
						Run another search
					</Link>
				</div>

				{fatal && (
					<div
						role="alert"
						className="kiami-fade-up mb-7 flex items-start gap-3 border-l-[3px] border-destructive bg-destructive/5 px-4 py-3"
					>
						<Warning
							size={16}
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

				<header className="mb-10 flex flex-wrap items-end justify-between gap-6">
					<div className="kiami-fade-up max-w-[680px]" style={{ animationDelay: "60ms" }}>
						<span className="eyebrow">Results</span>
						<h1 className="mt-3 font-heading text-[44px] font-semibold leading-[1.05] tracking-[-0.025em]">
							<CountUp value={result.leads.length} className="tnum mr-2" />
							{result.leads.length === 1 ? peopleSingular : peoplePlural} found
						</h1>
						{result.rationale && (
							<p
								className="kiami-fade-up mt-3 text-[15px] leading-snug text-muted-foreground"
								style={{ animationDelay: "180ms" }}
							>
								<Sparkle
									size={12}
									weight="fill"
									color="var(--color-brand)"
									className="mr-1.5 inline-block align-middle"
								/>
								{result.rationale}
							</p>
						)}
					</div>
					<div
						className="kiami-fade-up flex flex-wrap items-center gap-2"
						style={{ animationDelay: "120ms" }}
					>
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
				</header>

				<div
					className="kiami-fade-up mb-10 grid grid-cols-3 border-y"
					style={{ animationDelay: "180ms" }}
				>
					<MetricCell
						label="Primary index"
						count={primaryCount}
						sub={
							primaryCount > 0
								? `${primaryCount} matched directly`
								: "no direct matches"
						}
					/>
					<MetricCell
						label="Wider sweep"
						count={networkCount}
						sub={
							networkCount > 0
								? `${networkCount} from secondary sources`
								: "not needed"
						}
						bordered
					/>
					<MetricCell
						label="High profile"
						count={highCount}
						sub={
							highCount > 0
								? `${highCount} flagged for outreach`
								: "no standouts"
						}
						accent
						bordered
					/>
				</div>

				<div
					className="kiami-fade-up mb-2 flex flex-wrap items-baseline gap-7"
					style={{ animationDelay: "220ms" }}
				>
					{filters.map(([id, label, n]) => {
						const active = filter === id;
						return (
							<button
								type="button"
								key={id}
								onClick={() => setFilter(id)}
								className={cn(
									"relative inline-flex items-baseline gap-2 pb-2 text-[13px] transition-colors",
									active
										? "font-medium text-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{label}
								<span
									className={cn(
										"font-mono-display tnum text-[11px]",
										active ? "text-foreground" : "text-muted-foreground/70",
									)}
								>
									{n}
								</span>
								{active && (
									<span
										className="absolute right-0 bottom-0 left-0 h-[2px]"
										style={{ background: "var(--color-brand)" }}
									/>
								)}
							</button>
						);
					})}
				</div>

				{allTags.length > 0 && (
					<div
						className="kiami-fade-up mb-5 flex flex-wrap items-center gap-1.5 border-t pt-4"
						style={{ animationDelay: "260ms" }}
					>
						<span className="eyebrow mr-2">Tags</span>
						{allTags.map((t) => {
							const active = activeTags.has(t);
							const count = tagCounts.get(t) ?? 0;
							return (
								<button
									type="button"
									key={t}
									onClick={() => toggleTag(t)}
									className={cn(
										"inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
										active
											? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white"
											: "border-[var(--color-border)] bg-white text-muted-foreground hover:border-[var(--color-brand)]/40 hover:text-foreground",
									)}
								>
									<span className="font-medium">#{t}</span>
									<span
										className={cn(
											"font-mono-display tnum text-[10px]",
											active
												? "text-white/80"
												: "text-muted-foreground/70",
										)}
									>
										{count}
									</span>
								</button>
							);
						})}
						{activeTags.size > 0 && (
							<button
								type="button"
								onClick={() => setActiveTags(new Set())}
								className="ml-2 font-mono-display text-[10px] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground"
							>
								Clear ({activeTags.size})
							</button>
						)}
					</div>
				)}

				<div className="border-t">
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
							{visibleIdx.map((idx, i) => {
								const l = result.leads[idx];
								const isOpen = expanded.has(idx);
								const sched = scheduleByIdx[idx] ?? "idle";
								return (
									<div
										key={`${l.source}-${l.linkedin_url ?? l.full_name}-${idx}`}
										className="kiami-fade-up"
										style={{
											animationDelay: `${260 + i * 50}ms`,
											animationFillMode: "backwards",
										}}
									>
										<EditorialRow
											lead={l}
											expanded={isOpen}
											scheduleState={sched}
											activeTags={activeTags}
											onToggle={() => toggleExpand(idx)}
											onSchedule={() => scheduleOne(idx)}
											onToggleTag={toggleTag}
										/>
									</div>
								);
							})}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function MetricCell({
	label,
	count,
	sub,
	accent,
	bordered,
}: {
	label: string;
	count: number;
	sub: string;
	accent?: boolean;
	bordered?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex flex-col gap-2 px-6 py-7",
				bordered && "border-l",
			)}
		>
			<div className="flex items-center gap-2">
				<span
					className="h-1.5 w-1.5 rounded-full"
					style={{
						background: accent
							? "var(--color-brand)"
							: "var(--color-border-strong)",
					}}
				/>
				<span className="eyebrow">{label}</span>
			</div>
			<CountUp
				value={count}
				className={cn(
					"font-heading text-[44px] font-semibold leading-none tracking-[-0.02em] tnum",
					count === 0 && "text-muted-foreground",
				)}
			/>
			<span className="text-[12px] text-muted-foreground">{sub}</span>
		</div>
	);
}

function BriefButton({
	expanded,
	onClick,
}: {
	expanded: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex h-8 min-w-[124px] items-center justify-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors",
				expanded
					? "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-2)]"
					: "border border-[var(--color-brand)] bg-[var(--color-brand-tint)] text-[var(--color-brand)] hover:bg-[var(--color-brand-tint)]/70",
			)}
		>
			<Sparkle size={11} weight="fill" />
			{expanded ? "Hide brief" : "View brief"}
		</button>
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
	const scheduled = state === "scheduled";
	const error = state === "error";
	const green = loading || scheduled;
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
				disabled={loading || scheduled}
				onClick={onClick}
				className={cn(
					"relative z-10 min-w-[130px] gap-1.5 transition-colors",
					green &&
						"!bg-[#22A06B] !text-white hover:!bg-[#22A06B] !border-[#22A06B] disabled:opacity-100",
					error && "!border-destructive !text-destructive",
				)}
			>
				{loading ? (
					<>
						<Spinner size={12} className="animate-spin" />
						Scheduling…
					</>
				) : scheduled ? (
					<>
						<Check size={12} weight="bold" />
						Scheduled
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
	const scheduled = state === "scheduled";
	const error = state === "error";
	const green = loading || scheduled;
	if (lowCount === 0) return null;
	return (
		<Button
			size="default"
			variant="outline"
			disabled={loading || scheduled}
			onClick={onClick}
			className={cn(
				"gap-1.5 transition-colors",
				green &&
					"!bg-[#22A06B] !text-white hover:!bg-[#22A06B] !border-[#22A06B] disabled:opacity-100",
				error && "!border-destructive !text-destructive",
			)}
		>
			{loading ? (
				<>
					<Spinner size={14} className="animate-spin" />
					Scheduling {lowCount}…
				</>
			) : scheduled ? (
				<>
					<Check size={14} weight="bold" />
					Scheduled
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
	activeTags,
	onToggle,
	onSchedule,
	onToggleTag,
}: {
	lead: StoredLead;
	expanded: boolean;
	scheduleState: ScheduleState;
	activeTags: Set<string>;
	onToggle: () => void;
	onSchedule: () => void;
	onToggleTag: (tag: string) => void;
}) {
	const isHigh = !!lead.high_profile;
	const isSynth = lead.source === "synthesized";
	const initials = (lead.full_name ?? "")
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((s) => s[0]?.toUpperCase() ?? "")
		.join("");
	const tags = lead.tags ?? [];
	const visibleTags = tags.slice(0, 5);
	const hiddenTagCount = tags.length - visibleTags.length;

	return (
		<div
			className={cn(
				"relative border-b last:border-b-0",
				isSynth && "bg-[var(--color-brand-tint)]/30",
			)}
		>
			{isSynth && (
				<span
					aria-hidden
					className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
					style={{ background: "var(--color-brand)" }}
				/>
			)}
			<div className="grid grid-cols-[36px_minmax(0,1.6fr)_minmax(0,1fr)_120px_150px_28px] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
				{/* Avatar */}
				<button
					type="button"
					onClick={onToggle}
					aria-label={expanded ? "Collapse" : "Expand"}
					className="grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold transition-colors"
					style={{
						background: isSynth ? "var(--color-brand)" : "var(--color-brand-tint)",
						color: isSynth ? "#FFFFFF" : "var(--color-brand)",
					}}
				>
					{isSynth ? <Sparkle size={12} weight="fill" /> : initials || "·"}
				</button>

				{/* Name + title + tag chips */}
				<div className="min-w-0">
					<button
						type="button"
						onClick={onToggle}
						className="block w-full text-left"
					>
						<div className="flex items-center gap-2">
							<span className="truncate font-medium text-foreground">
								{lead.full_name}
							</span>
							{isSynth && (
								<span
									className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono-display text-[10px] font-semibold tracking-[0.12em] uppercase"
									style={{
										background: "var(--color-brand)",
										color: "#FFFFFF",
									}}
								>
									<Sparkle size={9} weight="fill" />
									Suggested by AI
								</span>
							)}
							{isHigh && !isSynth && (
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
					{visibleTags.length > 0 && (
						<div className="mt-1.5 flex flex-wrap items-center gap-1">
							{visibleTags.map((t) => {
								const active = activeTags.has(t);
								return (
									<button
										key={t}
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onToggleTag(t);
										}}
										className={cn(
											"rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
											active
												? "bg-[var(--color-brand)] text-white"
												: "bg-[var(--color-brand-tint)]/80 text-[var(--color-brand)] hover:bg-[var(--color-brand-tint)]",
										)}
									>
										#{t}
									</button>
								);
							})}
							{hiddenTagCount > 0 && (
								<span className="font-mono-display text-[10px] text-muted-foreground">
									+{hiddenTagCount}
								</span>
							)}
						</div>
					)}
				</div>

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

				{/* LinkedIn — synthesized leads never have a real profile,
				    so we show a clear "AI-suggested" indicator instead of
				    a button that 404s. */}
				<div>
					{isSynth ? (
						<span className="inline-flex items-center gap-1 font-mono-display text-[10px] tracking-[0.18em] text-muted-foreground/70 uppercase">
							<Sparkle size={9} weight="fill" />
							AI · no profile
						</span>
					) : lead.linkedin_url ? (
						<a
							href={lead.linkedin_url}
							target="_blank"
							rel="noreferrer"
							onClick={(e) => e.stopPropagation()}
							className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[12px] font-medium text-white transition-colors"
							style={{ background: "#0A66C2" }}
						>
							<LinkedinLogo size={12} weight="fill" />
							LinkedIn
						</a>
					) : (
						<span className="font-mono-display text-[10px] tracking-[0.18em] text-muted-foreground/70 uppercase">
							no profile
						</span>
					)}
				</div>

				{/* High-profile leads get a Brief CTA that opens the editorial
				    fold. Low-profile leads get the Schedule call action. */}
				<div>
					{isHigh ? (
						<BriefButton expanded={expanded} onClick={onToggle} />
					) : (
						<ScheduleButton state={scheduleState} onClick={onSchedule} />
					)}
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

	const sourceLabel =
		lead.source === "bettercontact"
			? "Primary index"
			: lead.source === "apollo"
				? "Wider sweep"
				: "Inferred";
	const signals: Array<[string, string | null]> = [
		["Email", lead.email ?? null],
		["Phone", lead.phone ?? null],
		["Industry", lead.company_industry ?? null],
		[
			"Headcount",
			lead.company_headcount != null ? String(lead.company_headcount) : null,
		],
		["Location", lead.location ?? null],
		["Seniority", lead.seniority ?? null],
		["Domain", lead.company_domain ?? null],
		["Source", sourceLabel],
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
					const useMono =
						k === "Email" ||
						k === "Phone" ||
						k === "Domain" ||
						/^[\d.,\s+]+$/.test(String(v));
					return (
						<div key={k} className="border-t py-3">
							<span className="eyebrow">{k}</span>
							<div
								className={cn(
									"mt-1 text-[13px] text-foreground",
									useMono && "font-mono-display tnum",
								)}
								style={{ wordBreak: "break-word" }}
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

			{lead.linkedin_url && lead.source !== "synthesized" && (
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
