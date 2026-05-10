import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	ArrowLeft,
	Buildings,
	Copy,
	Export,
	LinkSimple,
	LinkedinLogo,
	Sparkle,
	Star,
	Warning,
} from "@phosphor-icons/react";
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
	type StoredLead,
	type StoredSearchResult,
} from "@/hooks/use-search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/results")({
	component: ResultsPage,
});

type SourceFilter = "all" | "primary" | "network" | "high";

function ResultsPage() {
	const navigate = useNavigate();
	const { flow } = useMode();
	const [result, setResult] = useState<StoredSearchResult | null>(null);
	const [filter, setFilter] = useState<SourceFilter>("all");
	const [activeIdx, setActiveIdx] = useState<number | null>(null);

	useEffect(() => {
		const r = loadResult();
		if (!r) {
			void navigate({ to: "/new" });
			return;
		}
		setResult(r);
	}, [navigate]);

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
							<div className="grid grid-cols-[28px_1fr_180px_140px_120px_36px] items-center gap-4 border-b bg-muted px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
								<span />
								<span>{peopleSingular}</span>
								<span>Company</span>
								<span>Location</span>
								<span>Source</span>
								<span />
							</div>
							{visibleIdx.map((idx, i) => {
								const l = result.leads[idx];
								const isHigh = !!l.high_profile;
								return (
									<button
										type="button"
										key={`${l.source}-${l.linkedin_url ?? l.full_name}-${idx}`}
										onClick={() => isHigh && setActiveIdx(idx)}
										className={cn(
											"grid w-full grid-cols-[28px_1fr_180px_140px_120px_36px] items-center gap-4 px-4 py-3.5 text-left text-sm transition-colors",
											i < visibleIdx.length - 1 && "border-b",
											isHigh
												? "cursor-pointer hover:bg-muted/50"
												: "cursor-default",
										)}
									>
										<span className="grid h-5 w-5 place-items-center">
											{isHigh ? (
												<Star
													size={14}
													weight="fill"
													color="var(--color-brand)"
												/>
											) : null}
										</span>
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
									</button>
								);
							})}
						</>
					)}
				</Card>
			</div>

			<HighProfileDrawer
				open={activeIdx !== null}
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

// Translate the raw provider errors we get back from the action into a
// short, actionable message for the user. This is what makes the
// difference between "0 candidates ¯\_(ツ)_/¯" and "you're out of credits,
// here's what to do".
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
			hint: "Top up the BetterContact plan to resume searches. The wider sweep alone won't return candidates while the primary index is unreachable.",
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
