import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
	Note,
	Sparkle,
	UploadSimple,
	FilePdf,
	FileDoc,
	FileText,
	X,
	Spinner,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FocusedHeader } from "@/components/kiami/focused-header";
import { useMode } from "@/components/kiami/flow";
import { saveBrief } from "@/hooks/use-search";
import { parseFile } from "@/lib/parse-file";
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

const ACCEPT =
	".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown";

function PastePage() {
	const navigate = useNavigate();
	const { flow } = useMode();
	const [text, setText] = useState(SAMPLE_REC);
	const [touched, setTouched] = useState(false);
	const [fileMeta, setFileMeta] = useState<{
		name: string;
		kind: "pdf" | "docx" | "md" | "txt";
	} | null>(null);
	const [parsing, setParsing] = useState(false);
	const [parseError, setParseError] = useState<string | null>(null);
	const [dragOver, setDragOver] = useState(false);
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

	async function handleFile(file: File) {
		setParseError(null);
		setParsing(true);
		try {
			const result = await parseFile(file);
			setText(result.text);
			setTouched(true);
			setFileMeta({ name: file.name, kind: result.source });
		} catch (err) {
			setParseError(err instanceof Error ? err.message : String(err));
		} finally {
			setParsing(false);
		}
	}

	function clearFile() {
		setFileMeta(null);
		setParseError(null);
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
							Paste plain text or drop a PDF, DOCX, MD, or TXT file. Kiami's
							AI infers the search criteria for you before running.
						</p>
					</div>
				</div>

				<Card
					className={cn(
						"relative overflow-hidden bg-card p-0 transition-all",
						dragOver &&
							"ring-3 ring-[var(--color-brand-tint)] border-[var(--color-brand)]",
					)}
					onDragEnter={(e) => {
						e.preventDefault();
						setDragOver(true);
					}}
					onDragOver={(e) => {
						e.preventDefault();
						setDragOver(true);
					}}
					onDragLeave={(e) => {
						// Avoid flicker when moving over child elements.
						if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
						setDragOver(false);
					}}
					onDrop={(e) => {
						e.preventDefault();
						setDragOver(false);
						const f = e.dataTransfer.files?.[0];
						if (f) void handleFile(f);
					}}
				>
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
							Upload PDF / DOCX / MD / TXT
						</button>
						<input
							type="file"
							accept={ACCEPT}
							ref={fileRef}
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) void handleFile(f);
								e.target.value = "";
							}}
							className="hidden"
						/>
					</div>

					{fileMeta && (
						<div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-[12px]">
							<FileIcon kind={fileMeta.kind} />
							<span className="truncate font-medium text-foreground">
								{fileMeta.name}
							</span>
							<span className="text-muted-foreground">
								· extracted as {fileMeta.kind.toUpperCase()}
							</span>
							<button
								type="button"
								onClick={clearFile}
								className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
								aria-label="Clear file metadata"
							>
								<X size={12} weight="bold" />
							</button>
						</div>
					)}

					{parseError && (
						<div className="border-b bg-destructive/10 px-4 py-2.5 text-[12px] text-destructive">
							Couldn't read that file: {parseError}
						</div>
					)}

					<textarea
						value={text}
						onChange={(e) => {
							setText(e.target.value);
							setTouched(true);
						}}
						placeholder="Paste here, or drag a PDF / DOCX / MD / TXT into this card."
						className="block min-h-[440px] w-full resize-y border-0 bg-card px-5 py-4 font-mono-display text-[13px] leading-relaxed text-foreground outline-none"
					/>

					<div className="flex items-center justify-between border-t px-4 py-3">
						<span className="text-[12px] text-muted-foreground">
							{text.length} chars
						</span>
						<Button
							onClick={handleRun}
							disabled={text.trim().length < 20 || parsing}
							className="gap-1.5"
						>
							<Sparkle size={14} weight="fill" />
							Run search
						</Button>
					</div>

					{(dragOver || parsing) && (
						<div className="pointer-events-none absolute inset-0 grid place-items-center bg-card/85 backdrop-blur-sm">
							<div className="text-center">
								{parsing ? (
									<>
										<Spinner
											size={28}
											className="mx-auto animate-spin text-[var(--color-brand)]"
										/>
										<div className="mt-2 text-[13px] font-medium text-foreground">
											Reading the file…
										</div>
									</>
								) : (
									<>
										<UploadSimple
											size={28}
											className="mx-auto text-[var(--color-brand)]"
										/>
										<div className="mt-2 text-[13px] font-medium text-foreground">
											Drop to extract — PDF, DOCX, MD, or TXT
										</div>
									</>
								)}
							</div>
						</div>
					)}
				</Card>
			</div>
		</div>
	);
}

function FileIcon({ kind }: { kind: "pdf" | "docx" | "md" | "txt" }) {
	if (kind === "pdf") return <FilePdf size={14} />;
	if (kind === "docx") return <FileDoc size={14} />;
	return <FileText size={14} />;
}
