import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	ArrowRight,
	ArrowLeft,
	Check,
	Plus,
	Sparkle,
	PushPin,
	Trash,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FocusedHeader } from "@/components/kiami/focused-header";
import { useMode, type Flow } from "@/components/kiami/flow";
import { saveBrief } from "@/hooks/use-search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/new/form")({
	component: FormPage,
});

const STEPS = [
	{ n: 1, label: "Role" },
	{ n: 2, label: "Seniority" },
	{ n: 3, label: "Location" },
	{ n: 4, label: "Must-haves" },
	{ n: 5, label: "Review" },
];

const SENIORITY_OPTS = [
	{ id: "mid", label: "Mid", hint: "3–5 years" },
	{ id: "senior", label: "Senior", hint: "5–9 years" },
	{ id: "staff", label: "Staff / Principal", hint: "9+ years" },
	{ id: "manager", label: "Manager / Director", hint: "People leadership" },
];

const REC_PRESETS = [
	"Staff Backend Engineer",
	"Backend Tech Lead",
	"Principal Engineer",
	"Engineering Manager",
];
const SALES_PRESETS = [
	"HR-Tech · Series B",
	"Compliance SaaS",
	"People Analytics tools",
	"Mid-market HR",
];

const REC_MUSTHAVES = [
	"Shipped infra at Series-B+",
	"Go or Rust",
	"Fintech experience",
	"EU work authorization",
];
const SALES_MUSTHAVES = [
	"Series-A in last 12mo",
	"EU geography",
	"50–250 ee",
	"Replacing legacy stack",
];

const LOCATION_TAGS = ["Hybrid", "Remote", "On-site", "Will relocate"];

type FormState = {
	role: string;
	seniorityId: string;
	location: string;
	locationTags: string[];
	mustHaves: string[];
};

function defaultsFor(flow: Flow): FormState {
	return flow === "recruiting"
		? {
				role: "Senior Backend Engineer",
				seniorityId: "senior",
				location: "Berlin",
				locationTags: ["Hybrid"],
				mustHaves: REC_MUSTHAVES.slice(),
			}
		: {
				role: "HR-Tech SaaS · 50–250 employees",
				seniorityId: "manager",
				location: "EU · DACH + Nordics",
				locationTags: [],
				mustHaves: SALES_MUSTHAVES.slice(),
			};
}

function FormPage() {
	const navigate = useNavigate();
	const { flow } = useMode();
	const [step, setStep] = useState(1);
	const [state, setState] = useState<FormState>(() => defaultsFor(flow));
	const [touched, setTouched] = useState(false);

	useEffect(() => {
		if (!touched) setState(defaultsFor(flow));
	}, [flow, touched]);

	function update<K extends keyof FormState>(k: K, v: FormState[K]) {
		setTouched(true);
		setState((s) => ({ ...s, [k]: v }));
	}

	function handleRun() {
		const brief = composeBrief(flow, state);
		saveBrief({ flow, brief, mode: "form" });
		void navigate({ to: "/new/thinking" });
	}

	const totalSteps = STEPS.length;

	return (
		<div className="min-h-screen bg-muted">
			<FocusedHeader />
			<div className="mx-auto max-w-[760px] px-8 pt-10 pb-16">
				<Stepper step={step} onJump={setStep} />
				<Card className="mt-7 p-9">
					{step === 1 && (
						<Step1
							flow={flow}
							value={state.role}
							onChange={(v) => update("role", v)}
						/>
					)}
					{step === 2 && (
						<Step2
							value={state.seniorityId}
							onChange={(v) => update("seniorityId", v)}
						/>
					)}
					{step === 3 && (
						<Step3
							location={state.location}
							tags={state.locationTags}
							onLocation={(v) => update("location", v)}
							onTags={(v) => update("locationTags", v)}
						/>
					)}
					{step === 4 && (
						<Step4
							flow={flow}
							items={state.mustHaves}
							onChange={(v) => update("mustHaves", v)}
						/>
					)}
					{step === 5 && <Step5 flow={flow} state={state} />}
				</Card>
				<div className="mt-5 flex justify-between">
					<Button
						variant="outline"
						disabled={step === 1}
						onClick={() => setStep((s) => Math.max(1, s - 1))}
						className="gap-1.5"
					>
						<ArrowLeft size={14} />
						Back
					</Button>
					{step < totalSteps ? (
						<Button
							onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
							className="gap-1.5"
						>
							Continue
							<ArrowRight size={14} />
						</Button>
					) : (
						<Button onClick={handleRun} className="gap-1.5">
							<Sparkle size={14} weight="fill" />
							Run search
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

function Stepper({
	step,
	onJump,
}: {
	step: number;
	onJump: (n: number) => void;
}) {
	return (
		<div className="flex items-center">
			{STEPS.map((s, i) => {
				const done = s.n < step;
				const active = s.n === step;
				return (
					<div key={s.n} className="flex flex-1 items-center">
						<button
							type="button"
							onClick={() => onJump(s.n)}
							className="flex items-center gap-2.5 px-3 py-2"
						>
							<span
								className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold transition-colors"
								style={{
									background: active
										? "var(--color-brand)"
										: done
											? "var(--color-brand-tint)"
											: "var(--background)",
									color: active
										? "#fff"
										: done
											? "var(--color-brand)"
											: "var(--muted-foreground)",
									border: active ? "none" : "1px solid var(--border)",
								}}
							>
								{done ? <Check size={12} weight="bold" /> : s.n}
							</span>
							<span
								className={cn(
									"text-[13px]",
									active
										? "font-medium text-foreground"
										: done
											? "text-foreground/80"
											: "text-muted-foreground",
								)}
							>
								{s.label}
							</span>
						</button>
						{i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
					</div>
				);
			})}
		</div>
	);
}

function Q({
	eyebrow,
	title,
	hint,
	children,
}: {
	eyebrow: string;
	title: string;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<span className="text-[12px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
				{eyebrow}
			</span>
			<h2 className="mt-2 mb-1.5 font-heading text-[32px] font-semibold leading-tight tracking-tight">
				{title}
			</h2>
			{hint && <p className="mb-6 text-[15px] text-muted-foreground">{hint}</p>}
			{children}
		</div>
	);
}

function Step1({
	flow,
	value,
	onChange,
}: {
	flow: Flow;
	value: string;
	onChange: (v: string) => void;
}) {
	const isRec = flow === "recruiting";
	const suggestions = isRec ? REC_PRESETS : SALES_PRESETS;
	return (
		<Q
			eyebrow="Step 1 of 5"
			title={
				isRec
					? "What role are you hiring for?"
					: "What segment are you selling into?"
			}
			hint="Type freely — Kiami will normalize titles."
		>
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="h-13 rounded-xl px-4.5 text-base"
			/>
			<div className="mt-5 mb-2 text-[12px] text-muted-foreground">
				Suggestions
			</div>
			<div className="flex flex-wrap gap-2">
				{suggestions.map((s) => (
					<Badge
						key={s}
						variant="secondary"
						className="cursor-pointer py-1.5"
						onClick={() => onChange(s)}
					>
						{s}
					</Badge>
				))}
			</div>
		</Q>
	);
}

function Step2({
	value,
	onChange,
}: {
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<Q eyebrow="Step 2 of 5" title="What seniority are you targeting?">
			<div className="grid gap-2.5">
				{SENIORITY_OPTS.map((o) => {
					const sel = value === o.id;
					return (
						<label
							key={o.id}
							className={cn(
								"flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition-all",
								sel &&
									"border-[var(--color-brand)] ring-3 ring-[var(--color-brand-tint)]",
							)}
						>
							<input
								type="radio"
								name="seniority"
								className="sr-only"
								checked={sel}
								onChange={() => onChange(o.id)}
							/>
							<span
								className="grid h-[18px] w-[18px] place-items-center rounded-full"
								style={{
									border: `2px solid ${sel ? "var(--color-brand)" : "var(--color-border-strong)"}`,
								}}
							>
								{sel && (
									<span
										className="block h-2 w-2 rounded-full"
										style={{ background: "var(--color-brand)" }}
									/>
								)}
							</span>
							<div>
								<div className="font-medium text-foreground">{o.label}</div>
								<div className="text-[13px] text-muted-foreground">
									{o.hint}
								</div>
							</div>
						</label>
					);
				})}
			</div>
		</Q>
	);
}

function Step3({
	location,
	tags,
	onLocation,
	onTags,
}: {
	location: string;
	tags: string[];
	onLocation: (v: string) => void;
	onTags: (v: string[]) => void;
}) {
	function toggle(t: string) {
		onTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
	}
	return (
		<Q eyebrow="Step 3 of 5" title="Where should they be based?">
			<Input
				value={location}
				onChange={(e) => onLocation(e.target.value)}
				className="h-13 rounded-xl px-4.5 text-base"
			/>
			<div className="mt-3.5 flex flex-wrap gap-2">
				{LOCATION_TAGS.map((l) => {
					const sel = tags.includes(l);
					return (
						<Badge
							key={l}
							variant={sel ? "default" : "secondary"}
							className="cursor-pointer py-1.5"
							onClick={() => toggle(l)}
						>
							{l}
						</Badge>
					);
				})}
			</div>
		</Q>
	);
}

function Step4({
	flow,
	items,
	onChange,
}: {
	flow: Flow;
	items: string[];
	onChange: (v: string[]) => void;
}) {
	void flow;
	const [draft, setDraft] = useState("");
	function add() {
		const t = draft.trim();
		if (!t) return;
		onChange([...items, t]);
		setDraft("");
	}
	function remove(i: number) {
		onChange(items.filter((_, idx) => idx !== i));
	}
	return (
		<Q
			eyebrow="Step 4 of 5"
			title="Anything that's a hard must-have?"
			hint="Kiami enforces these; everything else is a soft preference."
		>
			<div className="grid gap-2">
				{items.map((m, i) => (
					<div
						key={`${m}-${i}`}
						className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3"
					>
						<PushPin size={14} weight="fill" color="var(--color-brand)" />
						<span className="text-sm text-foreground">{m}</span>
						<button
							type="button"
							onClick={() => remove(i)}
							className="ml-auto p-1 text-muted-foreground hover:text-destructive"
						>
							<Trash size={14} />
						</button>
					</div>
				))}
				<div className="flex items-center gap-2">
					<Input
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								add();
							}
						}}
						placeholder="Add a hard requirement"
						className="h-10"
					/>
					<Button
						type="button"
						variant="outline"
						onClick={add}
						className="gap-1.5"
					>
						<Plus size={14} weight="bold" />
						Add
					</Button>
				</div>
			</div>
		</Q>
	);
}

function Step5({ flow, state }: { flow: Flow; state: FormState }) {
	const isRec = flow === "recruiting";
	const sen = SENIORITY_OPTS.find((s) => s.id === state.seniorityId);
	const rows: Array<[string, string]> = [
		[isRec ? "Role" : "Segment", state.role || "—"],
		["Seniority", sen ? `${sen.label} · ${sen.hint}` : "—"],
		[
			"Location",
			[state.location, state.locationTags.join(" · ")]
				.filter(Boolean)
				.join(" · "),
		],
		["Must-haves", `${state.mustHaves.length} hard requirements`],
	];
	return (
		<Q
			eyebrow="Step 5 of 5"
			title="Ready to run."
			hint="Review before Kiami goes searching."
		>
			<div className="grid gap-2.5">
				{rows.map(([k, v]) => (
					<div
						key={k}
						className="flex items-center justify-between rounded-xl bg-muted px-4 py-3"
					>
						<span className="text-[13px] text-muted-foreground">{k}</span>
						<span className="text-sm font-medium text-foreground">
							{v || "—"}
						</span>
					</div>
				))}
			</div>
		</Q>
	);
}

function composeBrief(flow: Flow, s: FormState): string {
	const isRec = flow === "recruiting";
	const sen = SENIORITY_OPTS.find((x) => x.id === s.seniorityId);
	const lines: string[] = [];
	lines.push(`Flow: ${isRec ? "Recruiting" : "Lead Finder"}`);
	lines.push(`${isRec ? "Role" : "Segment"}: ${s.role}`);
	if (sen) lines.push(`Seniority: ${sen.label} (${sen.hint})`);
	if (s.location || s.locationTags.length) {
		const loc = [s.location, ...s.locationTags].filter(Boolean).join(" · ");
		lines.push(`Location: ${loc}`);
	}
	if (s.mustHaves.length) {
		lines.push("Must-haves:");
		for (const m of s.mustHaves) lines.push(`- ${m}`);
	}
	return lines.join("\n");
}
