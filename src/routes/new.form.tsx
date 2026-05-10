import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkle } from "@phosphor-icons/react";
import { FocusedHeader } from "@/components/kiami/focused-header";
import { useMode, type Flow } from "@/components/kiami/flow";
import { saveBrief } from "@/hooks/use-search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/new/form")({
	component: FormPage,
});

type Question = {
	key: string;
	label: string;
	title: string;
	hint?: string;
	placeholder?: string;
};

const REC_QUESTIONS: Question[] = [
	{
		key: "role",
		label: "Role",
		title: "What role are you hiring for?",
		hint: "Type freely — Kiami will normalize titles.",
		placeholder: "Senior Backend Engineer",
	},
	{
		key: "seniority",
		label: "Seniority",
		title: "What seniority and experience level?",
		hint: "Years of experience, scope, leadership — anything that matters.",
		placeholder: "Senior, 5–9 years, no people management",
	},
	{
		key: "location",
		label: "Location",
		title: "Where should they be based?",
		hint: "City, region, remote/hybrid, work-authorization needs.",
		placeholder: "Berlin · Hybrid · EU work auth",
	},
	{
		key: "mustHaves",
		label: "Must-haves",
		title: "Anything that's a hard must-have?",
		hint: "Skills, domains, languages — Kiami enforces these strictly.",
		placeholder: "Go or Rust · Fintech infra at Series-B+",
	},
];

const SALES_QUESTIONS: Question[] = [
	{
		key: "icp",
		label: "ICP",
		title: "What kind of companies do you sell to?",
		hint: "Industry, sub-segment, the tools they use today, anyone they're replacing.",
		placeholder: "HR-Tech SaaS · compliance & onboarding · replacing Workday",
	},
	{
		key: "sizeGeo",
		label: "Size & where",
		title: "How big are they and where are they based?",
		hint: "Headcount band, revenue, region — whatever's load-bearing for the deal.",
		placeholder: "51–200 employees · EU · DACH + Nordics",
	},
	{
		key: "signals",
		label: "Signals",
		title: "Any stage or buying signals that matter?",
		hint: "Funding, age, recent triggers (new hire, M&A, expansion, replacing legacy stack).",
		placeholder: "Series-A in last 12 mo · recently hired a CRO",
	},
	{
		key: "buyers",
		label: "Buyers",
		title: "Who's the decision maker?",
		hint: "Function, level, committee size — pick the people who actually sign or veto.",
		placeholder: "Head of People + VP Ops · 2–3 stakeholders",
	},
	{
		key: "constraints",
		label: "Constraints",
		title: "Any must-haves or hard exclusions?",
		hint: "Deal size, motion, regions to skip, anything to filter out.",
		placeholder: "$25–100k ACV · outbound motion · skip government & education",
	},
];

const REVIEW_LABEL = "Review";

function questionsFor(flow: Flow): Question[] {
	return flow === "sales" ? SALES_QUESTIONS : REC_QUESTIONS;
}

function FormPage() {
	const navigate = useNavigate();
	const { flow } = useMode();
	const questions = questionsFor(flow);
	const totalSteps = questions.length + 1; // questions + review

	const [step, setStep] = useState(1);
	const [answers, setAnswers] = useState<Record<string, string>>({});

	useEffect(() => {
		// Reset when the user toggles modes — different question set entirely.
		setStep(1);
		setAnswers({});
	}, [flow]);

	const isReview = step === totalSteps;
	const current = questions[step - 1];
	const currentAnswered = !isReview && (answers[current.key] ?? "").trim().length > 0;

	function setAnswer(key: string, value: string) {
		setAnswers((a) => ({ ...a, [key]: value }));
	}

	function handleRun() {
		const brief = composeBrief(flow, questions, answers);
		saveBrief({ flow, brief, mode: "form" });
		void navigate({ to: "/new/thinking" });
	}

	function next() {
		if (isReview) {
			handleRun();
			return;
		}
		// Don't advance until the current question has an answer — otherwise
		// pressing Continue (or Enter) on an empty field silently skipped to
		// review and ran the search with an empty brief.
		if (!currentAnswered) return;
		setStep((s) => Math.min(totalSteps, s + 1));
	}

	function prev() {
		setStep((s) => Math.max(1, s - 1));
	}

	return (
		<div className="flex min-h-screen flex-col bg-muted">
			<FocusedHeader />
			<ProgressBar
				step={step}
				total={totalSteps}
				label={isReview ? REVIEW_LABEL : current.label}
			/>
			<main className="flex flex-1 items-center justify-center px-8 pb-16">
				<div className="w-full max-w-[680px]">
					{isReview ? (
						<ReviewView
							flow={flow}
							questions={questions}
							answers={answers}
							onJumpToStep={setStep}
						/>
					) : (
						<QuestionView
							key={step}
							step={step}
							total={totalSteps}
							question={current}
							value={answers[current.key] ?? ""}
							onChange={(v) => setAnswer(current.key, v)}
							onSubmit={next}
						/>
					)}

					<div className="mt-12 flex items-center justify-between">
						<ArrowButton
							direction="back"
							disabled={step === 1}
							onClick={prev}
						/>
						{isReview ? (
							<RunButton onClick={handleRun} />
						) : (
							<ArrowButton
								direction="continue"
								disabled={!currentAnswered}
								onClick={next}
							/>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}

function ProgressBar({
	step,
	total,
	label,
}: {
	step: number;
	total: number;
	label: string;
}) {
	const pct = (step / total) * 100;
	return (
		<div className="mx-auto w-full max-w-[680px] px-8 pt-8">
			<div className="mb-2 flex items-baseline justify-between">
				<span className="text-[11px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
					Step {step} of {total}
				</span>
				<span className="text-[12px] font-medium text-foreground">{label}</span>
			</div>
			<div className="h-[3px] w-full overflow-hidden rounded-full bg-border">
				<div
					className="h-full rounded-full bg-[var(--color-brand)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

function QuestionView({
	question,
	value,
	onChange,
	onSubmit,
}: {
	step: number;
	total: number;
	question: Question;
	value: string;
	onChange: (v: string) => void;
	onSubmit: () => void;
}) {
	const inputRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		const el = inputRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${el.scrollHeight}px`;
	}, [value]);

	useEffect(() => {
		// Focus the field once the heading-reveal animation has had a moment
		// to start — feels less jarring than focusing on an empty card.
		const id = window.setTimeout(() => {
			inputRef.current?.focus();
		}, 200);
		return () => window.clearTimeout(id);
	}, []);

	return (
		<div>
			<AnimatedHeading text={question.title} />
			{question.hint && <AnimatedHint text={question.hint} delay={150} />}
			<textarea
				ref={inputRef}
				rows={1}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && !e.shiftKey) {
						e.preventDefault();
						onSubmit();
					}
				}}
				placeholder={question.placeholder}
				className="mt-12 w-full resize-none border-0 border-b-2 border-border bg-transparent px-0 py-3 text-[22px] leading-snug text-foreground outline-none transition-colors focus:border-[var(--color-brand)]"
			/>
		</div>
	);
}

function AnimatedHeading({ text }: { text: string }) {
	const words = text.split(" ");
	return (
		<h1 className="font-heading text-[40px] font-semibold leading-[1.15] tracking-tight text-foreground">
			{words.map((w, i) => (
				<span
					key={`${w}-${i}`}
					className="inline-block"
					style={{
						marginRight: "0.28em",
						animation: `kiami-word-fade 480ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 55}ms both`,
					}}
				>
					{w}
				</span>
			))}
		</h1>
	);
}

function AnimatedHint({ text, delay = 0 }: { text: string; delay?: number }) {
	return (
		<p
			className="mt-3 text-[15px] leading-snug text-muted-foreground"
			style={{
				animation: `kiami-word-fade 480ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
			}}
		>
			{text}
		</p>
	);
}

function ArrowButton({
	direction,
	onClick,
	disabled,
}: {
	direction: "back" | "continue";
	onClick: () => void;
	disabled?: boolean;
}) {
	const isContinue = direction === "continue";
	const Icon = isContinue ? ArrowRight : ArrowLeft;
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={isContinue ? "Continue" : "Back"}
			className={cn(
				"grid h-12 w-12 place-items-center rounded-full transition-all",
				isContinue
					? "bg-[var(--color-brand)] text-white shadow-md hover:bg-[var(--color-brand-2)]"
					: "border border-border bg-card text-foreground hover:bg-muted",
				disabled &&
					"pointer-events-none opacity-30 shadow-none",
			)}
		>
			<Icon size={18} weight="bold" />
		</button>
	);
}

function RunButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--color-brand)] px-6 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[var(--color-brand-2)]"
		>
			<Sparkle size={14} weight="fill" />
			Run search
		</button>
	);
}

function ReviewView({
	flow,
	questions,
	answers,
	onJumpToStep,
}: {
	flow: Flow;
	questions: Question[];
	answers: Record<string, string>;
	onJumpToStep: (n: number) => void;
}) {
	return (
		<div>
			<AnimatedHeading text="Ready to run." />
			<AnimatedHint
				text={`Review your ${flow === "sales" ? "lead" : "recruiting"} brief — Kiami will translate it into filters and run the search.`}
				delay={150}
			/>
			<div className="mt-12 grid gap-3">
				{questions.map((q, i) => {
					const v = (answers[q.key] ?? "").trim();
					return (
						<button
							key={q.key}
							type="button"
							onClick={() => onJumpToStep(i + 1)}
							className="grid grid-cols-[120px_1fr] items-baseline gap-4 rounded-xl bg-card px-5 py-4 text-left transition-colors hover:bg-card/80"
						>
							<span className="text-[11px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
								{q.label}
							</span>
							<span
								className={cn(
									"text-[15px] leading-snug",
									v ? "text-foreground" : "text-muted-foreground",
								)}
							>
								{v || "—"}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function composeBrief(
	flow: Flow,
	questions: Question[],
	answers: Record<string, string>,
): string {
	const lines: string[] = [];
	lines.push(`Flow: ${flow === "sales" ? "Lead Finder" : "Recruiting"}`);
	for (const q of questions) {
		const v = (answers[q.key] ?? "").trim();
		if (!v) continue;
		lines.push(`${q.label}: ${v}`);
	}
	return lines.join("\n");
}
