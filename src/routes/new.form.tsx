import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
	ArrowRight,
	ArrowLeft,
	Check,
	DotsThree,
	Plus,
	Sparkle,
	Users,
	Target,
	PushPin,
} from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FocusedHeader } from "@/components/kiami/focused-header";
import { IconTile } from "@/components/kiami/icon-tile";
import type { Flow } from "@/components/kiami/flow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/new/form")({
	component: FormPage,
});

const STEPS = [
	{ n: 1, label: "Flow" },
	{ n: 2, label: "Role" },
	{ n: 3, label: "Seniority" },
	{ n: 4, label: "Location" },
	{ n: 5, label: "Must-haves" },
	{ n: 6, label: "Review" },
];

function FormPage() {
	const [step, setStep] = useState(2);
	const [flow, setFlow] = useState<Flow>("recruiting");

	return (
		<div className="min-h-screen bg-muted">
			<FocusedHeader />
			<div className="mx-auto max-w-[760px] px-8 pt-10 pb-16">
				<Stepper step={step} onJump={setStep} />
				<Card className="mt-7 p-9">
					{step === 1 && <Step1 flow={flow} setFlow={setFlow} />}
					{step === 2 && <Step2 flow={flow} />}
					{step === 3 && <Step3 />}
					{step === 4 && <Step4 />}
					{step === 5 && <Step5 flow={flow} />}
					{step === 6 && <Step6 flow={flow} />}
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
					{step < 6 ? (
						<Button
							onClick={() => setStep((s) => Math.min(6, s + 1))}
							className="gap-1.5"
						>
							Continue
							<ArrowRight size={14} />
						</Button>
					) : (
						<Link
							to="/new/thinking"
							className={cn(buttonVariants(), "gap-1.5")}
						>
							<Sparkle size={14} weight="fill" />
							Run search
						</Link>
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
							onClick={() => onJump(s.n)}
							className="flex items-center gap-2.5 px-3 py-2"
						>
							<span
								className={cn(
									"grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold transition-colors",
								)}
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
								{done ? (
									<Check size={12} weight="bold" />
								) : (
									s.n
								)}
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

function Step1({ flow, setFlow }: { flow: Flow; setFlow: (v: Flow) => void }) {
	const opts: Array<{
		id: Flow;
		label: string;
		desc: string;
		tone: "peach" | "coral";
		Icon: React.ComponentType<{ size?: number }>;
	}> = [
		{
			id: "recruiting",
			label: "Recruiting",
			desc: "Roles, candidates, sourcing.",
			tone: "peach",
			Icon: Users,
		},
		{
			id: "sales",
			label: "Sales GTM",
			desc: "Accounts, buyers, intent.",
			tone: "coral",
			Icon: Target,
		},
	];
	return (
		<Q
			eyebrow="Step 1 of 6"
			title="Pick your flow"
			hint="You can change this later — Kiami adapts the prompts and result fields."
		>
			<div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
				{opts.map((o) => {
					const sel = flow === o.id;
					return (
						<button
							key={o.id}
							onClick={() => setFlow(o.id)}
							className={cn(
								"flex items-center gap-3.5 rounded-xl border bg-card p-4.5 text-left transition-all",
								sel && "border-[var(--color-brand)] ring-3 ring-[var(--color-brand-tint)]",
							)}
						>
							<IconTile tone={o.tone}>
								<o.Icon size={18} />
							</IconTile>
							<div>
								<div className="font-medium text-foreground">{o.label}</div>
								<div className="mt-0.5 text-[13px] text-muted-foreground">
									{o.desc}
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</Q>
	);
}

function Step2({ flow }: { flow: Flow }) {
	const isRec = flow === "recruiting";
	const suggestions = isRec
		? ["Staff Backend Engineer", "Backend Tech Lead", "Principal Engineer", "Engineering Manager"]
		: ["HR-Tech · Series B", "Compliance SaaS", "People Analytics tools", "Mid-market HR"];

	return (
		<Q
			eyebrow="Step 2 of 6"
			title={isRec ? "What role are you hiring for?" : "What segment are you selling into?"}
			hint="Type freely — Kiami will normalize titles."
		>
			<Input
				defaultValue={
					isRec ? "Senior Backend Engineer" : "HR-Tech SaaS · 50–250 employees"
				}
				className="h-13 rounded-xl px-4.5 text-base"
			/>
			<div className="mt-5 mb-2 text-[12px] text-muted-foreground">Suggestions</div>
			<div className="flex flex-wrap gap-2">
				{suggestions.map((s) => (
					<Badge key={s} variant="secondary" className="cursor-pointer py-1.5">
						{s}
					</Badge>
				))}
			</div>
		</Q>
	);
}

function Step3() {
	const opts: Array<[string, string, boolean?]> = [
		["Mid", "3–5 years"],
		["Senior", "5–9 years", true],
		["Staff / Principal", "9+ years"],
		["Manager / Director", "People leadership"],
	];
	return (
		<Q eyebrow="Step 3 of 6" title="What seniority are you targeting?">
			<div className="grid gap-2.5">
				{opts.map(([label, hint, sel]) => (
					<label
						key={label}
						className={cn(
							"flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition-all",
							sel && "border-[var(--color-brand)] ring-3 ring-[var(--color-brand-tint)]",
						)}
					>
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
							<div className="font-medium text-foreground">{label}</div>
							<div className="text-[13px] text-muted-foreground">{hint}</div>
						</div>
					</label>
				))}
			</div>
		</Q>
	);
}

function Step4() {
	return (
		<Q eyebrow="Step 4 of 6" title="Where should they be based?">
			<Input defaultValue="Berlin" className="h-13 rounded-xl px-4.5 text-base" />
			<div className="mt-3.5 flex flex-wrap gap-2">
				{[
					["Hybrid", true],
					["Remote", false],
					["On-site", false],
					["Will relocate", false],
				].map(([l, sel]) => (
					<Badge
						key={l as string}
						variant={sel ? "default" : "secondary"}
						className="cursor-pointer py-1.5"
					>
						{l as string}
					</Badge>
				))}
			</div>
		</Q>
	);
}

function Step5({ flow }: { flow: Flow }) {
	const isRec = flow === "recruiting";
	const items = isRec
		? ["Shipped infra at Series-B+", "Go or Rust", "Fintech experience", "EU work authorization"]
		: ["Series-A in last 12mo", "EU geography", "50–250 ee", "Replacing legacy stack"];
	return (
		<Q
			eyebrow="Step 5 of 6"
			title="Anything that's a hard must-have?"
			hint="Kiami enforces these; everything else is a soft preference."
		>
			<div className="grid gap-2">
				{items.map((m) => (
					<div
						key={m}
						className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3"
					>
						<PushPin
							size={14}
							weight="fill"
							color="var(--color-brand)"
						/>
						<span className="text-sm text-foreground">{m}</span>
						<button className="ml-auto p-1 text-muted-foreground hover:text-foreground">
							<DotsThree size={14} weight="bold" />
						</button>
					</div>
				))}
				<Button variant="outline" className="mt-1 justify-start gap-1.5">
					<Plus size={14} weight="bold" />
					Add must-have
				</Button>
			</div>
		</Q>
	);
}

function Step6({ flow }: { flow: Flow }) {
	const isRec = flow === "recruiting";
	const rows: Array<[string, string]> = [
		["Flow", isRec ? "Recruiting" : "Sales GTM"],
		[
			isRec ? "Role" : "Segment",
			isRec ? "Senior Backend Engineer" : "HR-Tech SaaS · 50–250 ee",
		],
		["Seniority", isRec ? "Senior · 5–9 yrs" : "Series-A · last 12 mo"],
		["Location", "Berlin · Hybrid"],
		[
			"Must-haves",
			isRec ? "4 hard requirements" : "4 hard criteria",
		],
	];
	return (
		<Q
			eyebrow="Step 6 of 6"
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
						<span className="text-sm font-medium text-foreground">{v}</span>
					</div>
				))}
			</div>
		</Q>
	);
}
