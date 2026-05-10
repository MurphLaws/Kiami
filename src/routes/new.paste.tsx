import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
	Sparkle,
	UploadSimple,
	FilePdf,
	FileDoc,
	FileText,
	X,
	Spinner,
	LinkSimple,
	LinkedinLogo,
	MagnifyingGlass,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { FocusedHeader } from "@/components/kiami/focused-header";
import { KiamiMark } from "@/components/kiami/logo";
import { useMode } from "@/components/kiami/flow";
import { saveBrief, useScrapeJob } from "@/hooks/use-search";
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

type SourceMode = "paste" | "url";

function PastePage() {
	const navigate = useNavigate();
	const { flow } = useMode();
	const scrapeJob = useScrapeJob();

	const [mode, setMode] = useState<SourceMode>("paste");
	const [text, setText] = useState(SAMPLE_REC);
	const [touched, setTouched] = useState(false);
	const [fileMeta, setFileMeta] = useState<{
		name: string;
		kind: "pdf" | "docx" | "md" | "txt";
	} | null>(null);
	const [parsing, setParsing] = useState(false);
	const [parseError, setParseError] = useState<string | null>(null);
	const [dragOver, setDragOver] = useState(false);
	const [url, setUrl] = useState("");
	const [scraping, setScraping] = useState(false);
	const [scrapeError, setScrapeError] = useState<string | null>(null);
	const [scrapeMeta, setScrapeMeta] = useState<{
		title?: string;
		company?: string;
		location?: string;
		source: string;
	} | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!touched) {
			setText(flow === "sales" ? SAMPLE_SALES : SAMPLE_REC);
		}
	}, [flow, touched]);

	const isRec = flow === "recruiting";

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

	async function handleScrape() {
		const u = url.trim();
		if (!u) return;
		setScraping(true);
		setScrapeError(null);
		setScrapeMeta(null);
		try {
			const res = (await scrapeJob({ url: u })) as
				| { ok: true; text: string; title?: string; company?: string; location?: string; source: string }
				| { ok: false; error: string };
			if (res.ok) {
				setText(res.text);
				setTouched(true);
				setScrapeMeta({
					title: res.title,
					company: res.company,
					location: res.location,
					source: res.source,
				});
				setMode("paste");
			} else {
				setScrapeError(res.error);
			}
		} catch (err) {
			setScrapeError(err instanceof Error ? err.message : String(err));
		} finally {
			setScraping(false);
		}
	}

	const eyebrow = isRec ? "Paste a job listing" : "Paste your ICP";
	const title = isRec
		? "Drop in your job description."
		: "Drop in your ICP one-pager.";

	return (
		<div className="relative min-h-screen overflow-hidden bg-muted">
			<MascotWatermark />
			<FocusedHeader />
			<div className="relative mx-auto max-w-[920px] px-8 pt-8 pb-16">
				<div className="mb-6">
					<span
						className="text-[11px] font-mono-display font-medium tracking-[0.18em] uppercase"
						style={{ color: "var(--color-brand)" }}
					>
						{eyebrow}
					</span>
					<h1 className="mt-2 font-heading text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-foreground">
						{title}
					</h1>
					<p className="mt-2 max-w-[560px] text-[15px] text-muted-foreground">
						Paste plain text, drop a PDF/DOCX/MD/TXT, or pull in a LinkedIn job
						listing URL — Kiami infers the search criteria before running.
					</p>
				</div>

				<ModeTabs mode={mode} onMode={setMode} />

				{mode === "url" ? (
					<UrlPanel
						url={url}
						onUrl={setUrl}
						onScrape={handleScrape}
						scraping={scraping}
						error={scrapeError}
					/>
				) : (
					<PastePanel
						text={text}
						onText={(v) => {
							setText(v);
							setTouched(true);
						}}
						onUpload={() => fileRef.current?.click()}
						fileMeta={fileMeta}
						clearFile={clearFile}
						parseError={parseError}
						parsing={parsing}
						dragOver={dragOver}
						onDragEnter={() => setDragOver(true)}
						onDragLeave={() => setDragOver(false)}
						onDrop={(file) => {
							setDragOver(false);
							void handleFile(file);
						}}
						scrapeMeta={scrapeMeta}
						onClearScrape={() => setScrapeMeta(null)}
						isRec={isRec}
					/>
				)}

				{mode === "paste" && (
					<div className="mt-5 flex items-center justify-between border-t pt-4">
						<span className="font-mono-display tnum text-[12px] text-muted-foreground">
							{text.length.toLocaleString()} chars
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
				)}

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
		</div>
	);
}

function ModeTabs({
	mode,
	onMode,
}: {
	mode: SourceMode;
	onMode: (m: SourceMode) => void;
}) {
	return (
		<div className="mb-4 flex items-center gap-1 border-b">
			<TabButton active={mode === "paste"} onClick={() => onMode("paste")}>
				<FileText size={13} />
				Paste / upload
			</TabButton>
			<TabButton active={mode === "url"} onClick={() => onMode("url")}>
				<LinkedinLogo size={13} weight="fill" />
				From LinkedIn URL
			</TabButton>
		</div>
	);
}

function TabButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative -mb-px inline-flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium transition-colors",
				active
					? "text-foreground"
					: "text-muted-foreground hover:text-foreground",
			)}
		>
			{children}
			{active && (
				<span
					className="absolute inset-x-3 -bottom-px h-[2px]"
					style={{ background: "var(--color-brand)" }}
				/>
			)}
		</button>
	);
}

function UrlPanel({
	url,
	onUrl,
	onScrape,
	scraping,
	error,
}: {
	url: string;
	onUrl: (v: string) => void;
	onScrape: () => void;
	scraping: boolean;
	error: string | null;
}) {
	return (
		<div className="rounded-[14px] border bg-card">
			<div className="flex items-center justify-between border-b px-4 py-3">
				<div className="flex items-center gap-2 text-[13px] text-muted-foreground">
					<LinkedinLogo size={14} weight="fill" />
					Paste a public job-listing URL
				</div>
			</div>
			<div className="px-5 py-6">
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<LinkSimple
							size={14}
							className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
						/>
						<input
							type="url"
							value={url}
							onChange={(e) => onUrl(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									onScrape();
								}
							}}
							placeholder="https://www.linkedin.com/jobs/view/…"
							className="block w-full rounded-md border bg-background py-2.5 pr-3 pl-9 text-[14px] outline-none transition-colors focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-tint)]"
						/>
					</div>
					<Button
						onClick={onScrape}
						disabled={scraping || url.trim().length === 0}
						className="gap-1.5"
					>
						{scraping ? (
							<>
								<Spinner size={14} className="animate-spin" />
								Reading…
							</>
						) : (
							<>
								<MagnifyingGlass size={14} weight="bold" />
								Fetch
							</>
						)}
					</Button>
				</div>
				{error && (
					<div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
						{error}
					</div>
				)}
				<div className="mt-5 grid gap-2 text-[12px] text-muted-foreground">
					<div className="font-mono-display tracking-[0.10em] uppercase text-[10px]">
						How this works
					</div>
					<p>
						Kiami fetches the public job page, extracts the structured JD
						(JSON-LD on most ATS pages, og: tags otherwise), and pre-fills the
						paste tab so you can review or edit before running.
					</p>
				</div>
			</div>
		</div>
	);
}

function PastePanel({
	text,
	onText,
	onUpload,
	fileMeta,
	clearFile,
	parseError,
	parsing,
	dragOver,
	onDragEnter,
	onDragLeave,
	onDrop,
	scrapeMeta,
	onClearScrape,
	isRec,
}: {
	text: string;
	onText: (v: string) => void;
	onUpload: () => void;
	fileMeta: { name: string; kind: "pdf" | "docx" | "md" | "txt" } | null;
	clearFile: () => void;
	parseError: string | null;
	parsing: boolean;
	dragOver: boolean;
	onDragEnter: () => void;
	onDragLeave: () => void;
	onDrop: (file: File) => void;
	scrapeMeta: {
		title?: string;
		company?: string;
		location?: string;
		source: string;
	} | null;
	onClearScrape: () => void;
	isRec: boolean;
}) {
	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-[14px] border bg-card transition-all",
				dragOver &&
					"border-[var(--color-brand)] ring-2 ring-[var(--color-brand-tint)]",
			)}
			onDragEnter={(e) => {
				e.preventDefault();
				onDragEnter();
			}}
			onDragOver={(e) => {
				e.preventDefault();
				onDragEnter();
			}}
			onDragLeave={(e) => {
				if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
				onDragLeave();
			}}
			onDrop={(e) => {
				e.preventDefault();
				const f = e.dataTransfer.files?.[0];
				if (f) onDrop(f);
			}}
		>
			<div className="flex items-center justify-between border-b px-4 py-3">
				<div className="flex items-center gap-2 text-[13px] text-muted-foreground">
					<FileText size={14} />
					{isRec ? "Job description" : "ICP description"}
				</div>
				<button
					type="button"
					onClick={onUpload}
					className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
				>
					<UploadSimple size={14} />
					Upload PDF / DOCX / MD / TXT
				</button>
			</div>

			{scrapeMeta && (
				<div className="flex items-start gap-3 border-b bg-[var(--color-brand-tint)]/40 px-4 py-3 text-[12px]">
					<LinkedinLogo
						size={14}
						weight="fill"
						className="mt-0.5 shrink-0"
						color="var(--color-brand)"
					/>
					<div className="min-w-0 flex-1">
						<div className="truncate font-medium text-foreground">
							{scrapeMeta.title ?? "Imported job listing"}
						</div>
						<div className="truncate text-muted-foreground">
							{[scrapeMeta.company, scrapeMeta.location]
								.filter(Boolean)
								.join(" · ")}
							{scrapeMeta.company || scrapeMeta.location ? " · " : ""}
							<span className="font-mono-display tracking-[0.12em] text-[10px] uppercase">
								via {scrapeMeta.source}
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={onClearScrape}
						className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						aria-label="Clear scraped metadata"
					>
						<X size={12} weight="bold" />
					</button>
				</div>
			)}

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
						className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
				onChange={(e) => onText(e.target.value)}
				placeholder="Paste here, or drag a PDF / DOCX / MD / TXT into this card."
				className="block min-h-[440px] w-full resize-y border-0 bg-card px-5 py-4 font-mono-display text-[13px] leading-relaxed text-foreground outline-none"
			/>

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
		</div>
	);
}

function FileIcon({ kind }: { kind: "pdf" | "docx" | "md" | "txt" }) {
	if (kind === "pdf") return <FilePdf size={14} />;
	if (kind === "docx") return <FileDoc size={14} />;
	return <FileText size={14} />;
}

/* The brief asked for a "bg image" — we use the mascot itself, faded to
   a watermark in the bottom-right of the page. Inherits brand color via
   currentColor; reduced motion / opacity so it never competes with the
   editor. */
function MascotWatermark() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute -right-32 -bottom-40 select-none"
			style={{ color: "var(--color-brand)", opacity: 0.05 }}
		>
			<KiamiMark size={620} plate={false} />
		</div>
	);
}
