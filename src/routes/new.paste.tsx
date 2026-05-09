import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
	Note,
	Sparkle,
	UploadSimple,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FocusedHeader } from "@/components/kiami/focused-header";
import { FlowTabs } from "@/components/kiami/flow-tabs";
import type { Flow } from "@/components/kiami/flow";
import { saveBrief } from "@/hooks/use-search";

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

function PastePage() {
	const navigate = useNavigate();
	const [flow, setFlow] = useState<Flow>("recruiting");
	const [text, setText] = useState(SAMPLE_REC);
	const [touched, setTouched] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!touched) {
			setText(flow === "sales" ? SAMPLE_SALES : SAMPLE_REC);
		}
	}, [flow, touched]);

	const isRec = flow === "recruiting";
	const accent = isRec ? "var(--color-peach-icon)" : "var(--color-coral-icon)";

	function handleRun() {
		const trimmed = text.trim();
		if (trimmed.length < 20) return;
		saveBrief({ flow, brief: trimmed, mode: "paste" });
		void navigate({ to: "/new/thinking" });
	}

	function handleFile(file: File) {
		const reader = new FileReader();
		reader.onload = () => {
			const content = String(reader.result ?? "");
			setText(content);
			setTouched(true);
		};
		reader.readAsText(file);
	}

	const eyebrow = isRec ? "Paste a job listing" : "Paste your ICP";
	const title = isRec
		? "Drop in your job description."
		: "Drop in your ICP one-pager.";

	return (
		<div className="min-h-screen bg-muted">
			<FocusedHeader />
			<div className="mx-auto max-w-[920px] px-8 pt-8 pb-16">
				<div className="mb-6 flex items-start justify-between">
					<div>
						<span
							className="text-[12px] font-semibold tracking-[0.10em] uppercase"
							style={{ color: accent }}
						>
							{eyebrow}
						</span>
						<h1 className="mt-1.5 font-heading text-[32px] font-semibold leading-tight tracking-tight">
							{title}
						</h1>
						<p className="mt-1.5 text-[15px] text-muted-foreground">
							Paste plain text or upload a .txt / .md file. Kiami's AI will
							infer the search filters before hitting BetterContact and Apollo.
						</p>
					</div>
					<FlowTabs value={flow} onChange={setFlow} />
				</div>

				<Card className="overflow-hidden bg-card p-0">
					<div className="flex items-center justify-between border-b px-4 py-3">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Note size={14} />
							{isRec ? "Job description" : "ICP description"}
						</div>
						<button
							type="button"
							onClick={() => fileRef.current?.click()}
							className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
						>
							<UploadSimple size={14} />
							Upload .md / .txt
						</button>
						<input
							type="file"
							accept=".txt,.md,.markdown,text/plain,text/markdown"
							ref={fileRef}
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) handleFile(f);
								e.target.value = "";
							}}
							className="hidden"
						/>
					</div>
					<textarea
						value={text}
						onChange={(e) => {
							setText(e.target.value);
							setTouched(true);
						}}
						className="block min-h-[440px] w-full resize-y border-0 bg-card px-5 py-4 font-mono-display text-[13px] leading-relaxed text-foreground outline-none"
					/>
					<div className="flex items-center justify-between border-t px-4 py-3">
						<span className="text-[12px] text-muted-foreground">
							{text.length} chars
						</span>
						<Button onClick={handleRun} disabled={text.trim().length < 20} className="gap-1.5">
							<Sparkle size={14} weight="fill" />
							Run search
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
}
