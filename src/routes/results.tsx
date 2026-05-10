import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
	ArrowLeft,
	Buildings,
	CaretDown,
	CaretRight,
	Copy,
	Export,
	LinkSimple,
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
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
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
	const [activeIdx, setActiveIdx] = useState<number | null>(null);
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

	const activeLead = activeIdx !== null ? result.leads[activeIdx] : null;
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
							<div className="grid grid-cols-[28px_28px_1fr_180px_140px_120px_140px_36px] items-center gap-4 border-b bg-muted px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
								<span />
								<span />
								<span>{peopleSingular}</span>
								<span>Company</span>
								<span>Location</span>
								<span>Source</span>
								<span />
								<span />
							</div>
							{visibleIdx.map((idx, i) => {
								const l = result.leads[idx];
								const isHigh = !!l.high_profile;
								const isOpen = expanded.has(idx);
								const sched = scheduleByIdx[idx] ?? "idle";
								return (
									<div
										key={`${l.source}-${l.linkedin_url ?? l.full_name}-${idx}`}
									>
										<div
											className={cn(
												"grid grid-cols-[28px_28px_1fr_180px_140px_120px_140px_36px] items-center gap-4 px-4 py-3.5 text-sm transition-colors",
												i < visibleIdx.length - 1 && !isOpen && "border-b",
											)}
										>
											<button
												type="button"
												onClick={() => toggleExpand(idx)}
												className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
												aria-label={isOpen ? "Collapse" : "Expand"}
											>
												{isOpen ? (
													<CaretDown size={14} weight="bold" />
												) : (
													<CaretRight size={14} weight="bold" />
												)}
											</button>
											<button
												type="button"
												onClick={() => isHigh && setActiveIdx(idx)}
												className="grid h-5 w-5 place-items-center"
												aria-label={isHigh ? "Open brief" : ""}
											>
												{isHigh ? (
													<Star
														size={14}
														weight="fill"
														color="var(--color-brand)"
													/>
												) : null}
											</button>
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<span className="truncate font-medium text-foreground">
														{l.full_name}
													</span>
													{isHigh && (
														<Badge
															variant="secondary"
															className="py-0.5 text-[10px]"
															style={{
																background: "var(--color-brand-tint)",
																color: "var(--color-brand)",
															}}
														>
															High profile
														</Badge>
													)}
												</div>
												<div className="mt-0.5 truncate text-[12px] text-muted-foreground">
													{[l.job_title, l.seniority]
														.filter(Boolean)
														.join(" · ") || "—"}
												</div>
											</div>
											<div className="min-w-0">
												<div className="flex items-center gap-1.5 truncate text-[13px] text-foreground/80">
													<Buildings size={12} />
													<span className="truncate">
														{l.company_name ?? "—"}
													</span>
												</div>
												<div className="truncate text-[11px] text-muted-foreground">
													{l.company_industry ?? l.company_domain ?? ""}
												</div>
											</div>
											<span className="truncate text-[13px] text-muted-foreground">
												{l.location ?? "—"}
											</span>
											<SourceBadge source={l.source} />
											<div>
												{!isHigh ? (
													<ScheduleButton
														state={sched}
														onClick={() => scheduleOne(idx)}
													/>
												) : (
													<Button
														size="sm"
														variant="outline"
														className="gap-1.5"
														onClick={() => setActiveIdx(idx)}
													>
														<Sparkle
															size={12}
															weight="fill"
															color="var(--color-brand)"
														/>
														Brief
													</Button>
												)}
											</div>
											<div className="justify-self-end">
												{l.linkedin_url ? (
													<a
														href={l.linkedin_url}
														target="_blank"
														rel="noreferrer"
														onClick={(e) => e.stopPropagation()}
														className="p-1.5 text-muted-foreground hover:text-foreground"
													>
														<LinkSimple size={14} weight="bold" />
													</a>
												) : null}
											</div>
										</div>
										{isOpen && (
											<FoldedDetails lead={l} last={i === visibleIdx.length - 1} />
										)}
									</div>
								);
							})}
						</>
					)}
				</Card>
			</div>

			<HighProfileDrawer
				open={activeIdx !== null && (result.leads[activeIdx]?.high_profile ?? false)}
				onOpenChange={(o) => !o && setActiveIdx(null)}
				lead={activeLead}
				flow={flow}
			/>
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
		<Button
			size="sm"
			variant="outline"
			disabled={loading}
			onClick={onClick}
			className={cn(
				"min-w-[130px] gap-1.5 transition-colors",
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

function FoldedDetails({ lead, last }: { lead: StoredLead; last: boolean }) {
	// Pull every populated field out of the raw upstream payload so the
	// recruiter can see what we actually have. Hide nullish, empty arrays,
	// and obvious internal-only fields.
	const raw = lead.raw ?? {};
	const entries = Object.entries(raw)
		.filter(([k, v]) => {
			if (k.startsWith("_")) return false;
			if (k === "raw") return false;
			if (v === null || v === undefined) return false;
			if (Array.isArray(v) && v.length === 0) return false;
			if (typeof v === "string" && v.trim() === "") return false;
			if (typeof v === "object") return Object.keys(v as object).length > 0;
			return true;
		})
		.sort((a, b) => a[0].localeCompare(b[0]));

	return (
		<div
			className={cn(
				"grid grid-cols-1 gap-4 bg-muted/40 px-4 py-5 md:grid-cols-2",
				!last && "border-b",
			)}
		>
			<div className="md:col-span-2">
				<div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
					Full record
					<span className="text-muted-foreground/70">
						· {entries.length} fields
					</span>
				</div>
				{entries.length === 0 && (
					<div className="text-[13px] text-muted-foreground">
						No additional fields available for this contact.
					</div>
				)}
			</div>
			{entries.map(([k, v]) => (
				<div
					key={k}
					className="flex flex-col gap-1 rounded-lg border bg-card px-3 py-2"
				>
					<span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
						{k.replace(/_/g, " ")}
					</span>
					<span className="break-words text-[13px] text-foreground">
						{renderValue(v)}
					</span>
				</div>
			))}
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

function HighProfileDrawer({
	open,
	onOpenChange,
	lead,
	flow,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	lead: StoredLead | null;
	flow: "recruiting" | "sales";
}) {
	const [copied, setCopied] = useState<"opener" | null>(null);
	if (!lead) {
		return (
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent side="right" />
			</Sheet>
		);
	}
	const copy = async (text: string, key: "opener") => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(key);
			window.setTimeout(() => setCopied(null), 1500);
		} catch {}
	};
	const verb = flow === "sales" ? "reach out" : "open a conversation";
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="sm:max-w-md md:max-w-lg lg:max-w-xl"
			>
				<SheetHeader>
					<div className="flex items-center gap-2">
						<Star size={14} weight="fill" color="var(--color-brand)" />
						<span className="text-[11px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
							High profile
						</span>
					</div>
					<SheetTitle className="font-heading text-[24px] tracking-tight">
						{lead.full_name}
					</SheetTitle>
					<SheetDescription>
						{[lead.job_title, lead.seniority].filter(Boolean).join(" · ") ||
							"—"}
					</SheetDescription>
				</SheetHeader>

				<div className="grid gap-4 px-4 pb-4">
					<div className="grid gap-2 rounded-xl border bg-card p-4">
						<div className="flex items-start gap-2">
							<Buildings
								size={14}
								className="mt-0.5 shrink-0 text-muted-foreground"
							/>
							<div className="min-w-0">
								<div className="font-medium text-foreground">
									{lead.company_name ?? "—"}
								</div>
								<div className="text-[12px] text-muted-foreground">
									{[lead.company_industry, lead.company_domain]
										.filter(Boolean)
										.join(" · ") || ""}
								</div>
							</div>
						</div>
						{lead.location && (
							<div className="text-[12px] text-muted-foreground">
								Based in {lead.location}
							</div>
						)}
					</div>

					{lead.brief ? (
						<>
							<section>
								<div className="mb-1.5 flex items-center gap-2">
									<Sparkle
										size={13}
										weight="fill"
										color="var(--color-brand)"
									/>
									<span className="text-[11px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
										Why they fit
									</span>
								</div>
								<p className="text-[14px] leading-relaxed text-foreground">
									{lead.brief.why_they_fit}
								</p>
							</section>

							<section>
								<div className="mb-1.5 flex items-center justify-between">
									<span className="text-[11px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
										Suggested opener
									</span>
									<button
										type="button"
										onClick={() =>
											copy(lead.brief?.suggested_opener ?? "", "opener")
										}
										className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
									>
										<Copy size={12} weight="bold" />
										{copied === "opener" ? "Copied" : "Copy"}
									</button>
								</div>
								<p
									className="rounded-xl border bg-muted px-3.5 py-3 text-[14px] leading-relaxed text-foreground"
									style={{ fontStyle: "italic" }}
								>
									{lead.brief.suggested_opener}
								</p>
							</section>
						</>
					) : (
						<div className="rounded-xl border border-dashed bg-muted/40 px-4 py-6 text-center text-[13px] text-muted-foreground">
							A brief wasn't generated for this {personNoun(flow)}. Use the
							LinkedIn link to {verb}.
						</div>
					)}
				</div>

				<div className="mt-auto flex flex-wrap gap-2 border-t bg-card px-4 py-3">
					{lead.linkedin_url ? (
						<a
							href={lead.linkedin_url}
							target="_blank"
							rel="noreferrer"
							className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
						>
							<LinkedinLogo size={14} weight="fill" />
							Open LinkedIn
						</a>
					) : null}
					{lead.company_domain && (
						<a
							href={`https://${lead.company_domain.replace(/^https?:\/\//, "")}`}
							target="_blank"
							rel="noreferrer"
							className={cn(
								buttonVariants({ size: "sm", variant: "outline" }),
								"gap-1.5",
							)}
						>
							<LinkSimple size={14} />
							Visit company
						</a>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
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
