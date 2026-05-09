import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
	MagnifyingGlass,
	Sparkle,
	ChatCircle,
	ChartLineUp,
	Tray,
	Target,
	Path,
	Graph,
} from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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

function Hero() {
	const [q, setQ] = useState(
		"Find me senior backend engineers in Berlin who shipped fintech infra…",
	);
	return (
		<section className="px-8 pt-22 pb-6 text-center">
			<div className="mx-auto max-w-[1140px]">
				<h1 className="font-heading text-[72px] font-semibold leading-[1.05] tracking-tight">
					Stop building <RotatingWord />
					<br />
					Start finding people
				</h1>
				<p className="mx-auto mt-6 max-w-[620px] text-[17px] leading-snug text-muted-foreground">
					Kiami replaces complex boolean strings and endless filter toggling
					with intelligent natural-language search, connecting you directly
					with the exact talent you need.
				</p>
				<form
					onSubmit={(e) => e.preventDefault()}
					className="mx-auto mt-9 flex max-w-[640px] gap-2.5"
				>
					<div className="relative flex-1">
						<MagnifyingGlass
							size={16}
							className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="e.g. Find me senior backend engineers in Berlin"
							className="h-12 rounded-xl pl-11 text-sm"
						/>
					</div>
					<Link
						to="/new/thinking"
						className={cn(
							buttonVariants({ size: "lg" }),
							"h-12 gap-2 rounded-xl px-6",
						)}
					>
						<Sparkle size={16} weight="fill" />
						Search now
					</Link>
				</form>
				<div className="mt-3.5 text-[13px] text-muted-foreground">
					14-day trial · No credit card
				</div>
			</div>
		</section>
	);
}

const LOGOS = [
	"Greenhouse",
	"Workday",
	"Lever",
	"Workable",
	"Ashby",
	"Salesforce",
	"HubSpot",
	"BambooHR",
	"Apollo",
	"Teamtailor",
	"SAP SuccessFactors",
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
							<span
								className="inline-block h-5 w-5 rounded-md"
								style={{
									background: i % 2 ? "var(--color-coral-icon)" : "var(--color-brand)",
								}}
							/>
							<span>{l}</span>
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
			Icon: ChatCircle,
			title: "Natural-language sourcing",
			body: "Describe the ideal candidate in plain English. We handle the boolean mapping for you.",
		},
		{
			Icon: ChartLineUp,
			title: "Experience graphing",
			body: "Visualize career trajectories to predict readiness for senior or leadership roles.",
		},
		{
			Icon: Tray,
			title: "Outreach-ready exports",
			body: "Push shortlists straight to your ATS or sequencer with structured fields.",
		},
	];
	const salesItems = [
		{
			Icon: Target,
			title: "Intent-based targeting",
			body: "Identify decision makers before they start evaluating competitors.",
		},
		{
			Icon: Path,
			title: "Account mapping",
			body: "Automatically generate buying committees for enterprise accounts.",
		},
		{
			Icon: Graph,
			title: "CRM-native handoff",
			body: "Drop ranked accounts into Salesforce or HubSpot with reasoning attached.",
		},
	];

	return (
		<section className="px-8 py-16">
			<div className="mx-auto max-w-[1100px]">
				<div className="mb-12 text-center">
					<h2 className="font-heading text-[40px] font-semibold leading-tight tracking-tight">
						One platform, two workflows.
					</h2>
					<p className="mt-3 text-[17px] text-muted-foreground">
						Purpose-built interfaces for the way your teams actually work.
					</p>
				</div>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<WorkflowColumn flow="recruiting" items={recItems} />
					<WorkflowColumn flow="sales" items={salesItems} />
				</div>
			</div>
		</section>
	);
}

function WorkflowColumn({
	flow,
	items,
}: {
	flow: "recruiting" | "sales";
	items: Array<{
		Icon: React.ComponentType<{ size?: number; weight?: "regular" | "fill" }>;
		title: string;
		body: string;
	}>;
}) {
	const tone = flow === "recruiting" ? "peach" : "coral";
	return (
		<div>
			<div className="mb-4">
				<TypePill flow={flow} />
			</div>
			<div className="grid gap-3">
				{items.map((it, i) => (
					<Card
						key={i}
						className="flex flex-row items-start gap-4 p-5 transition-shadow hover:shadow-md"
					>
						<IconTile tone={tone}>
							<it.Icon size={18} weight="regular" />
						</IconTile>
						<div>
							<div className="font-heading text-base font-semibold">
								{it.title}
							</div>
							<div className="mt-1 text-sm text-muted-foreground">
								{it.body}
							</div>
						</div>
					</Card>
				))}
			</div>
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
