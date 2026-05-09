import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	ArrowLeft,
	Export,
	LinkSimple,
	Sparkle,
	Buildings,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FocusedHeader } from "@/components/kiami/focused-header";
import { personNoun, useMode } from "@/components/kiami/flow";
import { loadResult, type StoredSearchResult } from "@/hooks/use-search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/results")({
	component: ResultsPage,
});

type SourceFilter = "all" | "primary" | "network";

function ResultsPage() {
	const navigate = useNavigate();
	const { flow } = useMode();
	const [result, setResult] = useState<StoredSearchResult | null>(null);
	const [filter, setFilter] = useState<SourceFilter>("all");

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

	const visible =
		filter === "all"
			? result.leads
			: result.leads.filter(
					(l) =>
						(l.source === "bettercontact" && filter === "primary") ||
						(l.source === "apollo" && filter === "network"),
				);

	const primaryCount = result.leads.filter(
		(l) => l.source === "bettercontact",
	).length;
	const networkCount = result.leads.filter(
		(l) => l.source === "apollo",
	).length;

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

				<div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
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
						label="Network"
						count={networkCount}
						sub={
							networkCount > 0
								? `${networkCount} via wider sweep`
								: "not needed"
						}
						accent="var(--color-coral-icon)"
					/>
				</div>

				<div className="mb-3 flex items-center gap-1.5">
					{(
						[
							["all", "All", result.leads.length],
							["primary", "Primary", primaryCount],
							["network", "Network", networkCount],
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
					{visible.length === 0 ? (
						<div className="px-8 py-14 text-center">
							<div className="font-heading text-[22px] font-semibold tracking-tight">
								No matching {peoplePlural}
							</div>
							<p className="mx-auto mt-2 max-w-[420px] text-[14px] text-muted-foreground">
								Try widening your brief — fewer must-haves, broader geography, or
								a more common job title.
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
							<div className="grid grid-cols-[1fr_180px_140px_120px_36px] items-center gap-4 border-b bg-muted px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
								<span>{peopleSingular}</span>
								<span>Company</span>
								<span>Location</span>
								<span>Source</span>
								<span />
							</div>
							{visible.map((l, i) => (
								<div
									key={`${l.source}-${l.linkedin_url ?? l.full_name}-${i}`}
									className={cn(
										"grid grid-cols-[1fr_180px_140px_120px_36px] items-center gap-4 px-4 py-3.5 text-sm",
										i < visible.length - 1 && "border-b",
									)}
								>
									<div className="min-w-0">
										<div className="truncate font-medium text-foreground">
											{l.full_name}
										</div>
										<div className="mt-0.5 truncate text-[12px] text-muted-foreground">
											{[l.job_title, l.seniority].filter(Boolean).join(" · ") ||
												"—"}
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
												className="p-1.5 text-muted-foreground hover:text-foreground"
											>
												<LinkSimple size={14} weight="bold" />
											</a>
										) : null}
									</div>
								</div>
							))}
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
	const label = isPrimary ? "Primary" : "Network";
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

function exportCsv(leads: StoredSearchResult["leads"], flow: "recruiting" | "sales") {
	if (typeof window === "undefined") return;
	const headers = [
		"source",
		"full_name",
		"job_title",
		"seniority",
		"location",
		"company_name",
		"company_industry",
		"company_domain",
		"linkedin_url",
	];
	const rows = leads.map((l) => {
		const sourceLabel = l.source === "bettercontact" ? "primary" : "network";
		return headers
			.map((h) =>
				h === "source"
					? csvCell(sourceLabel)
					: csvCell((l as Record<string, unknown>)[h]),
			)
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
