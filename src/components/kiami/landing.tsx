import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	MagnifyingGlass,
	Sparkle,
	ChatCircle,
	ChartLineUp,
	Tray,
	Target,
	Path,
	Graph,
	Briefcase,
	Megaphone,
} from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMode, type Flow } from "./flow";
import { saveBrief } from "@/hooks/use-search";
import { BrandLogo } from "./brand-logo";
import { TypePill } from "./type-pill";
import { IconTile } from "./icon-tile";
import { KiamiLogo } from "./logo";
import { RotatingWord } from "./rotating-word";
import { TiltedVideo } from "./tilted-video";

export function LandingPage() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<Hero />
			<TiltedVideo />
			<LogoStrip />
			<TwoWorkflows />
			<HowItWorks />
			<Quote />
			<CTABand />
			<FooterBlock />
		</div>
	);
}

// Each cycle entry pairs a flow with one example prompt. The hero
// alternates recruiting / sales / recruiting / sales so the demo
// audience sees both modes without the user having to toggle.
const PROMPT_CYCLE: Array<{ flow: Flow; prompt: string }> = [
	{
		flow: "recruiting",
		prompt:
			"Find me senior backend engineers in Berlin who shipped fintech infra at a Series-B+, fluent in Go or Rust",
	},
	{
		flow: "sales",
		prompt:
			"Find me Heads of People at HR-Tech SaaS in DACH (50–250 employees) who recently raised Series-A",
	},
	{
		flow: "recruiting",
		prompt:
			"Staff ML engineers in São Paulo with NLP background at a Series-A/B startup",
	},
	{
		flow: "sales",
		prompt:
			"VPs of RevOps at B2B SaaS in the US, 200–1000 headcount, replacing legacy CRM",
	},
	{
		flow: "recruiting",
		prompt:
			"Talent Acquisition leads in EU comfortable hiring senior engineers",
	},
	{
		flow: "sales",
		prompt:
			"CISOs at US fintech, 500+ employees, evaluating identity-verification vendors",
	},
];

function Hero() {
	const navigate = useNavigate();
	const { flow, setFlow } = useMode();
	const [tickIdx, setTickIdx] = useState(0);
	const initial = PROMPT_CYCLE[0];
	const [q, setQ] = useState(initial.prompt);
	const [touched, setTouched] = useState(false);
	const [focused, setFocused] = useState(false);
	const taRef = useRef<HTMLTextAreaElement | null>(null);

	// Auto-cycle the toggle + prompt every 6s while the input is idle.
	// Pauses the moment the user focuses or starts typing.
	useEffect(() => {
		if (touched || focused) return;
		const t = window.setInterval(() => {
			setTickIdx((i) => (i + 1) % PROMPT_CYCLE.length);
		}, 6_000);
		return () => window.clearInterval(t);
	}, [touched, focused]);

	// Drive prompt + flow off the cycle index whenever it advances.
	useEffect(() => {
		if (touched) return;
		const entry = PROMPT_CYCLE[tickIdx];
		setQ(entry.prompt);
		if (entry.flow !== flow) setFlow(entry.flow);
	}, [tickIdx, touched, flow, setFlow]);

	// Auto-grow so the whole prompt is always visible.
	useEffect(() => {
		const el = taRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${el.scrollHeight}px`;
	}, [q]);

	function submit() {
		const trimmed = q.trim();
		if (trimmed.length < 5) return;
		saveBrief({ flow, brief: trimmed, mode: "paste" });
		void navigate({ to: "/new/thinking" });
	}

	function pickFlow(next: Flow) {
		setTouched(true);
		setFlow(next);
		const matching = PROMPT_CYCLE.find((e) => e.flow === next);
		if (matching) setQ(matching.prompt);
		setTimeout(() => taRef.current?.focus(), 0);
	}

	return (
		<section className="px-8 pt-22 pb-6 text-center">
			<div className="mx-auto max-w-[1140px]">
				<h1 className="font-heading text-[72px] font-semibold leading-[1.05] tracking-tight">
					Stop building <RotatingWord />
					<br />
					Start finding people
				</h1>
				<p className="mx-auto mt-6 max-w-[620px] text-[17px] leading-snug text-muted-foreground">
					Kiami replaces complex boolean strings and endless{" "}
					<span
						className="font-medium"
						style={{ color: "var(--color-brand)" }}
					>
						filter
					</span>{" "}
					toggling with intelligent natural-language search, connecting
					you directly with the exact{" "}
					{flow === "sales" ? "buyers" : "talent"} you need.
				</p>

				<div className="mt-7 flex justify-center">
					<FlowToggle flow={flow} onPick={pickFlow} />
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						submit();
					}}
					className="mx-auto mt-5 flex max-w-[760px] items-stretch gap-2.5"
				>
					<div className="relative flex-1">
						<MagnifyingGlass
							size={16}
							className="absolute top-3.5 left-4 text-muted-foreground"
						/>
						<textarea
							ref={taRef}
							value={q}
							rows={1}
							onChange={(e) => {
								setQ(e.target.value);
								setTouched(true);
							}}
							onFocus={() => setFocused(true)}
							onBlur={() => setFocused(false)}
							onKeyDown={(e) => {
								// Submit on plain Enter; Shift+Enter makes a newline.
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									submit();
								}
							}}
							placeholder={
								flow === "sales"
									? "e.g. Heads of People at HR-Tech SaaS in DACH"
									: "e.g. Senior backend engineers in Berlin"
							}
							className="block w-full resize-none overflow-hidden rounded-xl border border-input bg-background px-4 py-3 pl-11 text-left text-[15px] leading-[1.45] outline-none transition-colors focus:border-[var(--color-brand)]"
						/>
					</div>
					<Button
						type="submit"
						size="lg"
						className="self-start gap-2 rounded-xl px-6"
						style={{ height: 48 }}
					>
						<Sparkle size={16} weight="fill" />
						Search now
					</Button>
				</form>
				<div className="mt-3.5 text-[13px] text-muted-foreground">
					14-day trial · No credit card
				</div>
			</div>
		</section>
	);
}

function FlowToggle({
	flow,
	onPick,
}: {
	flow: Flow;
	onPick: (f: Flow) => void;
}) {
	const idx = flow === "recruiting" ? 0 : 1;
	return (
		<div
			role="tablist"
			aria-label="Search mode"
			className="relative inline-flex items-center rounded-full border bg-card p-1 shadow-sm"
		>
			{/* Sliding indicator — single pill that physically moves
			    between the two tabs instead of fading the bg in/out.
			    The springy easing gives it a satisfying snap. */}
			<span
				aria-hidden
				className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow-sm transition-transform duration-[420ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
				style={{
					background: "var(--color-brand)",
					left: 4,
					transform: `translateX(${idx * 100}%)`,
				}}
			/>
			<FlowTab
				active={flow === "recruiting"}
				onClick={() => onPick("recruiting")}
				icon={<Briefcase size={14} weight="fill" />}
				label="Hiring"
			/>
			<FlowTab
				active={flow === "sales"}
				onClick={() => onPick("sales")}
				icon={<Megaphone size={14} weight="fill" />}
				label="Leads"
			/>
		</div>
	);
}

function FlowTab({
	active,
	onClick,
	icon,
	label,
}: {
	active: boolean;
	onClick: () => void;
	icon: React.ReactNode;
	label: string;
}) {
	return (
		<button
			type="button"
			role="tab"
			aria-selected={active}
			onClick={onClick}
			className={cn(
				"relative z-10 inline-flex h-9 w-[112px] items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-colors duration-300",
				active ? "text-white" : "text-muted-foreground hover:text-foreground",
			)}
		>
			{icon}
			{label}
		</button>
	);
}

const LOGOS: Array<{ name: string; domain: string }> = [
	{ name: "Greenhouse", domain: "greenhouse.io" },
	{ name: "Workday", domain: "workday.com" },
	{ name: "Lever", domain: "lever.co" },
	{ name: "Workable", domain: "workable.com" },
	{ name: "Ashby", domain: "ashbyhq.com" },
	{ name: "Salesforce", domain: "salesforce.com" },
	{ name: "HubSpot", domain: "hubspot.com" },
	{ name: "BambooHR", domain: "bamboohr.com" },
	{ name: "Apollo", domain: "apollo.io" },
	{ name: "Teamtailor", domain: "teamtailor.com" },
	{ name: "SAP SuccessFactors", domain: "sap.com" },
];

function LogoStrip() {
	return (
		<section className="pt-2 pb-14">
			<div className="mx-auto max-w-[1100px] px-8">
				<div className="mb-5 text-center text-[11px] font-semibold tracking-[0.14em] text-muted-foreground/80 uppercase">
					Plugs into the tools your teams already use
				</div>
			</div>
			<div className="kiami-marquee-mask overflow-hidden border-y bg-card py-6">
				<div
					className="flex w-max gap-14"
					style={{ animation: "kiami-marquee 38s linear infinite" }}
				>
					{[...LOGOS, ...LOGOS].map((l, i) => (
						<div
							key={i}
							className="flex shrink-0 items-center gap-3 font-heading text-[19px] font-medium whitespace-nowrap"
							style={{ color: "var(--color-ink-2)" }}
						>
							<BrandLogo domain={l.domain} name={l.name} size={28} />
							<span>{l.name}</span>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function TwoWorkflows() {
	const recItems = [
		{
			title: "Natural-language sourcing",
			body: "Describe the ideal candidate in plain English. Kiami handles the boolean mapping.",
		},
		{
			title: "Experience graphing",
			body: "Visualize career trajectories to predict readiness for senior or leadership roles.",
		},
		{
			title: "Outreach-ready exports",
			body: "Push shortlists straight to your ATS or sequencer with structured fields.",
		},
	];
	const salesItems = [
		{
			title: "Intent-based targeting",
			body: "Identify decision makers before they start evaluating competitors.",
		},
		{
			title: "Account mapping",
			body: "Automatically generate buying committees for enterprise accounts.",
		},
		{
			title: "CRM-native handoff",
			body: "Drop ranked accounts into Salesforce or HubSpot with reasoning attached.",
		},
	];

	return (
		<section className="bg-paper px-8 py-20">
			<div className="mx-auto max-w-[1100px]">
				<div className="mb-12">
					<span className="eyebrow">What you get</span>
					<h2 className="mt-3 font-heading text-[40px] font-semibold leading-[1.1] tracking-[-0.025em]">
						One platform, two workflows.
					</h2>
					<p className="mt-2 max-w-[520px] text-[16px] text-muted-foreground">
						Purpose-built surfaces for the way your teams actually work — same
						pipeline, different vocabulary.
					</p>
				</div>
				<div className="grid grid-cols-1 gap-x-12 md:grid-cols-2 md:divide-x md:divide-[var(--color-border)]">
					<WorkflowColumn label="Recruiting" items={recItems} />
					<WorkflowColumn label="Lead Finder" items={salesItems} pl />
				</div>
			</div>
		</section>
	);
}

function WorkflowColumn({
	label,
	items,
	pl,
}: {
	label: string;
	items: Array<{ title: string; body: string }>;
	pl?: boolean;
}) {
	return (
		<div className={pl ? "md:pl-12" : ""}>
			<div className="mb-6 inline-flex items-center gap-2">
				<span
					className="inline-block h-1.5 w-1.5 rounded-full"
					style={{ background: "var(--color-brand)" }}
				/>
				<span className="eyebrow">{label}</span>
			</div>
			<ul className="grid">
				{items.map((it, i) => (
					<li
						key={i}
						className="grid grid-cols-[44px_1fr] items-start gap-4 border-t py-5 last:border-b"
					>
						<span
							className="font-mono-display tnum text-[12px] tracking-[0.04em]"
							style={{ color: "var(--color-brand)" }}
						>
							{String(i + 1).padStart(2, "0")}
						</span>
						<div>
							<div className="font-heading text-[18px] font-semibold leading-tight tracking-[-0.015em]">
								{it.title}
							</div>
							<div className="mt-1.5 text-[14px] leading-snug text-muted-foreground">
								{it.body}
							</div>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

function HowItWorks() {
	const steps = [
		{
			n: "01",
			title: "Describe what you need",
			body: "Paste a JD or ICP, or just type. No filters, no schemas.",
		},
		{
			n: "02",
			title: "Agent runs the search",
			body: "Kiami reasons through trajectories, intent, and fit — not just keywords.",
		},
		{
			n: "03",
			title: "Review ranked results",
			body: "Each match arrives with the reasoning behind it. Iterate by replying.",
		},
	];
	return (
		<section className="border-y bg-muted px-8 py-14">
			<div className="mx-auto max-w-[1100px]">
				<div className="mb-9">
					<span className="text-[12px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
						How it works
					</span>
					<h2 className="mt-2 max-w-[520px] font-heading text-[40px] font-semibold leading-tight tracking-tight">
						From a sentence to a shortlist in minutes.
					</h2>
				</div>
				<div className="grid grid-cols-1 gap-5 md:grid-cols-3">
					{steps.map((s) => (
						<div
							key={s.n}
							className="border-t pt-4"
							style={{ borderTopColor: "var(--color-border-strong)" }}
						>
							<div
								className="mb-3 font-mono-display text-[12px]"
								style={{ color: "var(--color-brand)" }}
							>
								{s.n}
							</div>
							<div className="mb-2 font-heading text-xl font-semibold">
								{s.title}
							</div>
							<div className="text-[15px] text-muted-foreground">{s.body}</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function Quote() {
	return (
		<section className="px-8 py-18">
			<div className="mx-auto max-w-[880px] text-center">
				<span className="text-[12px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
					Customer story
				</span>
				<p className="my-6 font-heading text-[32px] font-medium leading-tight tracking-tight">
					“We replaced four contractors and a 30-tab Boolean cheat sheet with
					Kiami. Time-to-shortlist dropped from days to under an hour.”
				</p>
				<div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
					<div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-[13px] font-semibold text-foreground">
						JM
					</div>
					<div className="text-left">
						<div className="font-medium text-foreground">Jordan Mata</div>
						<div>Head of Talent · Northwind</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function CTABand() {
	return (
		<section className="px-8 pt-6 pb-24">
			<div
				className="mx-auto flex max-w-[1100px] flex-col items-start justify-between gap-6 rounded-3xl px-12 py-14 md:flex-row md:items-center"
				style={{ background: "var(--color-ink-strong)", color: "#fff" }}
			>
				<div>
					<h3 className="font-heading text-[40px] font-semibold leading-tight tracking-tight text-white">
						Ready to stop filtering?
					</h3>
					<p className="mt-3 max-w-[520px] text-base text-white/70">
						Sign up free, run your first search in a sentence, and decide if
						Kiami earns its place in your stack.
					</p>
				</div>
				<div className="flex shrink-0 gap-2.5">
					<Link
						to="/dashboard"
						className={cn(buttonVariants({ size: "lg" }), "rounded-xl")}
					>
						Start for free
					</Link>
					<Button
						variant="ghost"
						size="lg"
						className="rounded-xl border border-white/25 text-white hover:bg-white/10 hover:text-white"
					>
						Talk to sales
					</Button>
				</div>
			</div>
		</section>
	);
}

function FooterBlock() {
	return (
		<footer className="border-t bg-card px-8 pt-12 pb-8">
			<div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-8 md:grid-cols-5">
				<div className="col-span-2 md:col-span-1">
					<KiamiLogo size={20} />
					<p className="mt-3 max-w-[280px] text-[13px] text-muted-foreground">
						Agentic search for recruiting and lead finding.
					</p>
				</div>
				{[
					["Product", ["Platform", "Recruiting", "Lead Finder", "Pricing"]],
					["Company", ["About", "Careers", "Blog", "Contact"]],
					["Resources", ["Docs", "API", "Community", "Status"]],
					["Legal", ["Privacy", "Terms", "Security"]],
				].map(([h, items]) => (
					<div key={h as string}>
						<div className="mb-3 text-[13px] font-semibold">
							{h as string}
						</div>
						<ul className="grid gap-2">
							{(items as string[]).map((i) => (
								<li
									key={i}
									className="text-[13px] text-muted-foreground hover:text-foreground"
								>
									<a href="#">{i}</a>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
			<Separator className="mx-auto my-8 max-w-[1100px]" />
			<div className="mx-auto flex max-w-[1100px] items-center justify-between text-[12px] text-muted-foreground">
				<span>© 2026 Kiami AI. All rights reserved.</span>
				<span>SOC 2 Type II · GDPR</span>
			</div>
		</footer>
	);
}
