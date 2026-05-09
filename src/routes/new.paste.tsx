import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
	Note,
	Sparkle,
	Plus,
	Pencil,
	UploadSimple,
} from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FocusedHeader } from "@/components/kiami/focused-header";
import { FlowTabs } from "@/components/kiami/flow-tabs";
import type { Flow } from "@/components/kiami/flow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/new/paste")({
	component: PastePage,
});

const SAMPLE_REC = `Senior Backend Engineer — Berlin (hybrid)
We're hiring a Senior Backend Engineer to scale our payments platform.

Requirements:
• 5+ years of backend experience, ideally in fintech or high-volume systems
• Strong Go or Rust; comfortable with distributed systems and event-driven design
• Has shipped infrastructure at a Series-B or later startup
• Based in Berlin or willing to relocate; hybrid (3 days in office)

Nice to have:
• Open-source contributions to fintech tooling
• Multilingual — English + German preferred`;

const SAMPLE_SALES = `Ideal Customer Profile — HR-Tech, EU
We sell automated compliance to HR-tech companies that recently raised Series-A.

Target accounts:
• Headcount: 50–250
• Geography: EU (DACH + Nordics priority)
• Funding: Series-A in last 12 months
• Stack: Workday or BambooHR (replacing legacy)
• Trigger: New Head of People hired in last 90 days

Buyers: Head of People, VP HR, COO`;

type FieldRow = { label: string; value: string; confidence: "high" | "med" | "low" };

const REC_FIELDS: FieldRow[] = [
	{ label: "Role", value: "Senior Backend Engineer", confidence: "high" },
	{ label: "Seniority", value: "5–9 years", confidence: "high" },
	{ label: "Location", value: "Berlin · hybrid", confidence: "high" },
	{ label: "Domain", value: "Fintech · Payments", confidence: "high" },
	{ label: "Stack", value: "Go or Rust · distributed systems", confidence: "med" },
	{ label: "Stage", value: "Series-B+", confidence: "med" },
	{ label: "Languages", value: "English (req) · German (pref)", confidence: "low" },
];

const SALES_FIELDS: FieldRow[] = [
	{ label: "Segment", value: "HR-Tech · SaaS", confidence: "high" },
	{ label: "Headcount", value: "50–250 employees", confidence: "high" },
	{ label: "Geography", value: "EU · DACH + Nordics", confidence: "high" },
	{ label: "Funding", value: "Series-A in last 12 mo", confidence: "high" },
	{ label: "Stack", value: "Workday or BambooHR", confidence: "med" },
	{ label: "Trigger", value: "New Head of People · 90d", confidence: "med" },
	{ label: "Buyers", value: "Head of People · VP HR · COO", confidence: "high" },
];

function PastePage() {
	const [flow, setFlow] = useState<Flow>("recruiting");
	const [text, setText] = useState(SAMPLE_REC);
	useEffect(() => {
		setText(flow === "sales" ? SAMPLE_SALES : SAMPLE_REC);
	}, [flow]);

	const isRec = flow === "recruiting";
	const accent = isRec ? "var(--color-peach-icon)" : "var(--color-coral-icon)";
	const tint = isRec ? "var(--color-peach)" : "var(--color-coral)";
	const fields = isRec ? REC_FIELDS : SALES_FIELDS;

	return (
		<div className="min-h-screen bg-muted">
			<FocusedHeader />
			<div className="mx-auto max-w-[1200px] px-8 pt-8 pb-16">
				<div className="mb-6 flex items-start justify-between">
					<div>
						<span
							className="text-[12px] font-semibold tracking-[0.10em] uppercase"
							style={{ color: accent }}
						>
							Paste a description
						</span>
						<h1 className="mt-1.5 font-heading text-[32px] font-semibold leading-tight tracking-tight">
							Drop in your {isRec ? "JD" : "ICP"}.
						</h1>
						<p className="mt-1.5 text-[15px] text-muted-foreground">
							Kiami extracts the criteria as you type. Edit anything that's
							wrong on the right.
						</p>
					</div>
					<FlowTabs value={flow} onChange={setFlow} />
				</div>

				<div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
					<Card className="overflow-hidden bg-card p-0">
						<div className="flex items-center justify-between border-b px-4 py-3">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Note size={14} />
								Description
							</div>
							<button className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
								<UploadSimple size={14} />
								Upload .md / .txt
							</button>
						</div>
						<textarea
							value={text}
							onChange={(e) => setText(e.target.value)}
							className="block min-h-[460px] w-full resize-y border-0 bg-card px-5 py-4 font-mono-display text-[13px] leading-relaxed text-foreground outline-none"
						/>
						<div className="flex items-center justify-between border-t px-4 py-2.5 text-[12px] text-muted-foreground">
							<span>{text.length} chars · auto-saved</span>
							<span className="flex items-center gap-1.5">
								<span className="h-1.5 w-1.5 rounded-full bg-[#22A06B]" />
								Parsing live
							</span>
						</div>
					</Card>

					<Card className="bg-card p-0">
						<div className="flex items-center justify-between border-b px-4 py-3.5">
							<div className="flex items-center gap-2">
								<Sparkle size={14} weight="fill" color={accent} />
								<div className="text-sm font-medium">Inferred criteria</div>
							</div>
							<span className="text-[13px] text-muted-foreground">
								{fields.length} fields · 3s ago
							</span>
						</div>
						<div className="py-1">
							{fields.map((f, i) => (
								<div
									key={f.label}
									className="grid grid-cols-[120px_1fr_60px] items-center gap-3 px-4 py-3"
									style={{
										borderBottom:
											i < fields.length - 1 ? "1px solid var(--border)" : "none",
									}}
								>
									<div className="text-[12px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
										{f.label}
									</div>
									<div className="flex items-center gap-2.5">
										<span
											className="h-1.5 w-1.5 shrink-0 rounded-full"
											style={{ background: tint }}
										/>
										<span className="text-sm text-foreground">{f.value}</span>
										<button className="ml-auto p-1 text-muted-foreground hover:text-foreground">
											<Pencil size={14} />
										</button>
									</div>
									<span
										className="justify-self-end text-[11px] font-medium"
										style={{
											color:
												f.confidence === "high"
													? "#22A06B"
													: f.confidence === "med"
														? "#B07A1E"
														: "var(--muted-foreground)",
										}}
									>
										{f.confidence === "high"
											? "94%"
											: f.confidence === "med"
												? "78%"
												: "62%"}
									</span>
								</div>
							))}
						</div>
						<div className="flex items-center justify-between border-t px-4 py-3.5">
							<button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
								<Plus size={14} weight="bold" />
								Add field
							</button>
							<Link
								to="/new/thinking"
								className={cn(buttonVariants(), "gap-1.5")}
							>
								<Sparkle size={14} weight="fill" />
								Run search
							</Link>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
