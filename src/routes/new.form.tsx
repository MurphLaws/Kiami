import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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

// Recruiting form: short and role-shaped.
type RecState = {
	role: string;
	seniorityId: string;
	location: string;
	locationTags: string[];
	mustHaves: string[];
};

// Lead Finder form: firmographic, multi-step. Maps cleanly to the BC and
// Apollo company filters and to the buying committee shape sales teams
// actually use.
type SalesState = {
	industry: string;
	subSegment: string;
	headcountRange: string;
	geography: string;
	regionTags: string[];
	fundingStage: string;
	revenueRange: string;
	companyAge: string;
	techStack: string[];
	competitors: string[];
	triggers: string[];
	buyerFunctions: string[];
	buyerLevels: string[];
	committeeSize: string;
	dealSize: string;
	salesMotion: string;
	mustHaves: string[];
	exclude: string[];
};

const REC_PRESETS = [
	"Staff Backend Engineer",
	"Backend Tech Lead",
	"Principal Engineer",
	"Engineering Manager",
];

const SALES_INDUSTRY_PRESETS = [
	"HR-Tech SaaS",
	"FinTech",
	"Healthtech",
	"Devtools",
	"Vertical SaaS",
	"Cybersecurity",
];

const SENIORITY_OPTS = [
	{ id: "mid", label: "Mid", hint: "3–5 years" },
	{ id: "senior", label: "Senior", hint: "5–9 years" },
	{ id: "staff", label: "Staff / Principal", hint: "9+ years" },
	{ id: "manager", label: "Manager / Director", hint: "People leadership" },
];

const HEADCOUNT_OPTS = [
	{ id: "1-10", label: "1–10", hint: "Pre-seed / seed" },
	{ id: "11-50", label: "11–50", hint: "Seed / Series A" },
	{ id: "51-200", label: "51–200", hint: "Series A / B" },
	{ id: "201-500", label: "201–500", hint: "Series B / C" },
	{ id: "501-1000", label: "501–1000", hint: "Series C+" },
	{ id: "1001-5000", label: "1001–5000", hint: "Late stage" },
	{ id: "5001+", label: "5001+", hint: "Enterprise" },
];

const FUNDING_STAGE_OPTS = [
	{ id: "bootstrapped", label: "Bootstrapped" },
	{ id: "pre-seed", label: "Pre-seed" },
	{ id: "seed", label: "Seed" },
	{ id: "series-a", label: "Series A" },
	{ id: "series-b", label: "Series B" },
	{ id: "series-c", label: "Series C+" },
	{ id: "public", label: "Public" },
	{ id: "any", label: "Any" },
];

const REVENUE_OPTS = [
	{ id: "<1m", label: "Under $1M" },
	{ id: "1-5m", label: "$1–5M" },
	{ id: "5-25m", label: "$5–25M" },
	{ id: "25-100m", label: "$25–100M" },
	{ id: "100-500m", label: "$100–500M" },
	{ id: "500m+", label: "$500M+" },
	{ id: "any", label: "Any / unknown" },
];

const AGE_OPTS = [
	{ id: "0-2", label: "0–2 yrs" },
	{ id: "3-5", label: "3–5 yrs" },
	{ id: "6-10", label: "6–10 yrs" },
	{ id: "10+", label: "10+ yrs" },
	{ id: "any", label: "Any" },
];

const COMMITTEE_SIZE_OPTS = [
	{ id: "1", label: "Single decision maker" },
	{ id: "2-3", label: "2–3 stakeholders" },
	{ id: "4-6", label: "4–6 (typical mid-market)" },
	{ id: "7+", label: "7+ (enterprise)" },
];

const DEAL_SIZE_OPTS = [
	{ id: "<5k", label: "< $5k ACV" },
	{ id: "5-25k", label: "$5–25k ACV" },
	{ id: "25-100k", label: "$25–100k ACV" },
	{ id: "100-500k", label: "$100–500k ACV" },
	{ id: "500k+", label: "$500k+ ACV" },
];

const MOTION_OPTS = [
	{ id: "plg", label: "Product-led" },
	{ id: "inbound", label: "Inbound / marketing-led" },
	{ id: "outbound", label: "Outbound / SDR-led" },
	{ id: "channel", label: "Channel / partner" },
	{ id: "enterprise", label: "Enterprise field" },
];

const REC_LOCATION_TAGS = ["Hybrid", "Remote", "On-site", "Will relocate"];
const SALES_REGION_TAGS = [
	"North America",
	"EU",
	"DACH",
	"Nordics",
	"UK & Ireland",
	"LATAM",
	"APAC",
	"MENA",
];

const REC_MUSTHAVES = [
	"Shipped infra at Series-B+",
	"Go or Rust",
	"Fintech experience",
	"EU work authorization",
];

const SALES_TECH_PRESETS = [
	"Workday",
	"BambooHR",
	"Salesforce",
	"HubSpot",
	"Snowflake",
	"Segment",
	"AWS",
	"Google Cloud",
];

const SALES_TRIGGER_PRESETS = [
	"Recent funding round",
	"New CRO/VP Sales hired",
	"Hiring sales engineers",
	"Replacing legacy stack",
	"Expanding to new region",
	"M&A activity",
];

const SALES_COMPETITOR_PRESETS = [
	"Workday",
	"BambooHR",
	"Rippling",
	"Gusto",
	"Deel",
];

const BUYER_FUNCTION_OPTS = [
	"People / HR",
	"Engineering",
	"Sales",
	"Marketing",
	"Finance",
	"Operations",
	"Product",
	"IT / Security",
	"Legal",
	"Customer Success",
];

const BUYER_LEVEL_OPTS = [
	"C-Suite",
	"VP",
	"Head of",
	"Director",
	"Manager",
	"Senior IC",
];

const SALES_MUSTHAVES = [
	"Series-A in last 12mo",
	"EU geography",
	"50–250 employees",
	"Replacing legacy stack",
];

const SALES_EXCLUDE = ["Government", "Education", "Pre-seed"];

function defaultsRec(): RecState {
	return {
		role: "Senior Backend Engineer",
		seniorityId: "senior",
		location: "Berlin",
		locationTags: ["Hybrid"],
		mustHaves: REC_MUSTHAVES.slice(),
	};
}

function defaultsSales(): SalesState {
	return {
		industry: "HR-Tech SaaS",
		subSegment: "Compliance & onboarding",
		headcountRange: "51-200",
		geography: "EU · DACH + Nordics",
		regionTags: ["EU", "DACH"],
		fundingStage: "series-a",
		revenueRange: "5-25m",
		companyAge: "3-5",
		techStack: ["Workday"],
		competitors: ["Workday"],
		triggers: ["Series-A funding round in last 12 mo"],
		buyerFunctions: ["People / HR"],
		buyerLevels: ["VP", "Head of"],
		committeeSize: "2-3",
		dealSize: "25-100k",
		salesMotion: "outbound",
		mustHaves: SALES_MUSTHAVES.slice(),
		exclude: SALES_EXCLUDE.slice(),
	};
}

function FormPage() {
	const navigate = useNavigate();
	const { flow } = useMode();
	const [step, setStep] = useState(1);
	const [touched, setTouched] = useState(false);
	const [recState, setRecState] = useState<RecState>(() => defaultsRec());
	const [salesState, setSalesState] = useState<SalesState>(() =>
		defaultsSales(),
	);

	useEffect(() => {
		// Restart at step 1 when the user toggles modes; defaults reseed if untouched.
		setStep(1);
		if (!touched) {
			setRecState(defaultsRec());
			setSalesState(defaultsSales());
		}
	}, [flow, touched]);

	const steps = useMemo(
		() => (flow === "sales" ? SALES_STEPS : REC_STEPS),
		[flow],
	);
	const totalSteps = steps.length;

	function updateRec<K extends keyof RecState>(k: K, v: RecState[K]) {
		setTouched(true);
		setRecState((s) => ({ ...s, [k]: v }));
	}
	function updateSales<K extends keyof SalesState>(k: K, v: SalesState[K]) {
		setTouched(true);
		setSalesState((s) => ({ ...s, [k]: v }));
	}

	function handleRun() {
		const brief =
			flow === "sales"
				? composeSalesBrief(salesState)
				: composeRecBrief(recState);
		saveBrief({ flow, brief, mode: "form" });
		void navigate({ to: "/new/thinking" });
	}

	const safeStep = Math.min(step, totalSteps);

	return (
		<div className="min-h-screen bg-muted">
			<FocusedHeader />
			<div className="mx-auto max-w-[760px] px-8 pt-10 pb-16">
				<Stepper steps={steps} step={safeStep} onJump={setStep} />
				<Card className="mt-7 p-9">
					{flow === "recruiting" ? (
						<RecBody
							step={safeStep}
							state={recState}
							update={updateRec}
						/>
					) : (
						<SalesBody
							step={safeStep}
							state={salesState}
							update={updateSales}
						/>
					)}
				</Card>
				<div className="mt-5 flex justify-between">
					<Button
						variant="outline"
						disabled={safeStep === 1}
						onClick={() => setStep((s) => Math.max(1, s - 1))}
						className="gap-1.5"
					>
						<ArrowLeft size={14} />
						Back
					</Button>
					{safeStep < totalSteps ? (
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

const REC_STEPS = [
	{ n: 1, label: "Role" },
	{ n: 2, label: "Seniority" },
	{ n: 3, label: "Location" },
	{ n: 4, label: "Must-haves" },
	{ n: 5, label: "Review" },
];

const SALES_STEPS = [
	{ n: 1, label: "Industry" },
	{ n: 2, label: "Sub-segment" },
	{ n: 3, label: "Headcount" },
	{ n: 4, label: "Geography" },
	{ n: 5, label: "Funding" },
	{ n: 6, label: "Revenue" },
	{ n: 7, label: "Company age" },
	{ n: 8, label: "Tech stack" },
	{ n: 9, label: "Replacing" },
	{ n: 10, label: "Triggers" },
	{ n: 11, label: "Buyer fn" },
	{ n: 12, label: "Buyer level" },
	{ n: 13, label: "Committee" },
	{ n: 14, label: "Deal size" },
	{ n: 15, label: "Motion" },
	{ n: 16, label: "Must-haves" },
	{ n: 17, label: "Exclude" },
	{ n: 18, label: "Review" },
];

function Stepper({
	steps,
	step,
	onJump,
}: {
	steps: { n: number; label: string }[];
	step: number;
	onJump: (n: number) => void;
}) {
	// Above 6 steps the labels won't fit in the row — collapse to a thin
	// progress strip with a current-step caption.
	const compact = steps.length > 6;
	if (compact) {
		const current = steps.find((s) => s.n === step);
		return (
			<div>
				<div className="mb-2 flex items-baseline justify-between">
					<span className="text-[12px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
						Step {step} of {steps.length}
					</span>
					<span className="text-[13px] font-medium text-foreground">
						{current?.label}
					</span>
				</div>
				<div className="grid grid-cols-[repeat(var(--n),minmax(0,1fr))] gap-1">
					<style>{`.kiami-strip{--n:${steps.length}}`}</style>
					<div className="kiami-strip contents">
						{steps.map((s) => (
							<button
								key={s.n}
								type="button"
								onClick={() => onJump(s.n)}
								aria-label={`Step ${s.n} — ${s.label}`}
								className={cn(
									"h-1.5 rounded-full transition-colors",
									s.n < step
										? "bg-[var(--color-brand)]"
										: s.n === step
											? "bg-[var(--color-brand)]"
											: "bg-border",
								)}
							/>
						))}
					</div>
				</div>
			</div>
		);
	}
	return (
		<div className="flex items-center">
			{steps.map((s, i) => {
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
						{i < steps.length - 1 && (
							<span className="h-px flex-1 bg-border" />
						)}
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
			<h2 className="mt-2 mb-1.5 font-heading text-[28px] font-semibold leading-tight tracking-tight">
				{title}
			</h2>
			{hint && (
				<p className="mb-6 text-[15px] text-muted-foreground">{hint}</p>
			)}
			{children}
		</div>
	);
}

// ---------- Recruiting body ----------

function RecBody({
	step,
	state,
	update,
}: {
	step: number;
	state: RecState;
	update: <K extends keyof RecState>(k: K, v: RecState[K]) => void;
}) {
	if (step === 1) {
		return (
			<Q
				eyebrow="Step 1 of 5"
				title="What role are you hiring for?"
				hint="Type freely — Kiami will normalize titles."
			>
				<Input
					value={state.role}
					onChange={(e) => update("role", e.target.value)}
					className="h-13 rounded-xl px-4.5 text-base"
				/>
				<div className="mt-5 mb-2 text-[12px] text-muted-foreground">
					Suggestions
				</div>
				<div className="flex flex-wrap gap-2">
					{REC_PRESETS.map((s) => (
						<Badge
							key={s}
							variant="secondary"
							className="cursor-pointer py-1.5"
							onClick={() => update("role", s)}
						>
							{s}
						</Badge>
					))}
				</div>
			</Q>
		);
	}
	if (step === 2) {
		return (
			<RadioListStep
				eyebrow="Step 2 of 5"
				title="What seniority are you targeting?"
				options={SENIORITY_OPTS}
				value={state.seniorityId}
				onChange={(v) => update("seniorityId", v)}
			/>
		);
	}
	if (step === 3) {
		return (
			<Q eyebrow="Step 3 of 5" title="Where should they be based?">
				<Input
					value={state.location}
					onChange={(e) => update("location", e.target.value)}
					className="h-13 rounded-xl px-4.5 text-base"
				/>
				<TagPicker
					tags={REC_LOCATION_TAGS}
					value={state.locationTags}
					onChange={(v) => update("locationTags", v)}
					className="mt-3.5"
				/>
			</Q>
		);
	}
	if (step === 4) {
		return (
			<MustHavesStep
				eyebrow="Step 4 of 5"
				title="Anything that's a hard must-have?"
				hint="Kiami enforces these; everything else is a soft preference."
				items={state.mustHaves}
				onChange={(v) => update("mustHaves", v)}
			/>
		);
	}
	const sen = SENIORITY_OPTS.find((s) => s.id === state.seniorityId);
	return (
		<Q
			eyebrow="Step 5 of 5"
			title="Ready to run."
			hint="Review before Kiami goes searching."
		>
			<ReviewRows
				rows={[
					["Role", state.role || "—"],
					["Seniority", sen ? `${sen.label} · ${sen.hint}` : "—"],
					[
						"Location",
						[state.location, state.locationTags.join(" · ")]
							.filter(Boolean)
							.join(" · ") || "—",
					],
					[
						"Must-haves",
						`${state.mustHaves.length} hard requirement${state.mustHaves.length === 1 ? "" : "s"}`,
					],
				]}
			/>
		</Q>
	);
}

// ---------- Lead Finder body ----------

function SalesBody({
	step,
	state,
	update,
}: {
	step: number;
	state: SalesState;
	update: <K extends keyof SalesState>(k: K, v: SalesState[K]) => void;
}) {
	const total = SALES_STEPS.length;
	const eyebrow = `Step ${step} of ${total}`;

	if (step === 1) {
		return (
			<Q
				eyebrow={eyebrow}
				title="What industry are you selling into?"
				hint="Be as specific as you can — vertical SaaS works better than just SaaS."
			>
				<Input
					value={state.industry}
					onChange={(e) => update("industry", e.target.value)}
					className="h-13 rounded-xl px-4.5 text-base"
				/>
				<div className="mt-5 mb-2 text-[12px] text-muted-foreground">
					Common picks
				</div>
				<div className="flex flex-wrap gap-2">
					{SALES_INDUSTRY_PRESETS.map((s) => (
						<Badge
							key={s}
							variant="secondary"
							className="cursor-pointer py-1.5"
							onClick={() => update("industry", s)}
						>
							{s}
						</Badge>
					))}
				</div>
			</Q>
		);
	}
	if (step === 2) {
		return (
			<Q
				eyebrow={eyebrow}
				title="Any sub-segment to narrow it down?"
				hint="e.g. 'compliance & onboarding', 'mid-market HR', 'mobile-first banking'."
			>
				<Input
					value={state.subSegment}
					onChange={(e) => update("subSegment", e.target.value)}
					className="h-13 rounded-xl px-4.5 text-base"
					placeholder="Optional sub-segment"
				/>
			</Q>
		);
	}
	if (step === 3) {
		return (
			<RadioListStep
				eyebrow={eyebrow}
				title="What headcount range are you targeting?"
				options={HEADCOUNT_OPTS}
				value={state.headcountRange}
				onChange={(v) => update("headcountRange", v)}
			/>
		);
	}
	if (step === 4) {
		return (
			<Q
				eyebrow={eyebrow}
				title="Where are these companies based?"
				hint="Free text plus broader region tags."
			>
				<Input
					value={state.geography}
					onChange={(e) => update("geography", e.target.value)}
					className="h-13 rounded-xl px-4.5 text-base"
				/>
				<TagPicker
					tags={SALES_REGION_TAGS}
					value={state.regionTags}
					onChange={(v) => update("regionTags", v)}
					className="mt-3.5"
				/>
			</Q>
		);
	}
	if (step === 5) {
		return (
			<RadioListStep
				eyebrow={eyebrow}
				title="What funding stage fits the ICP?"
				options={FUNDING_STAGE_OPTS}
				value={state.fundingStage}
				onChange={(v) => update("fundingStage", v)}
			/>
		);
	}
	if (step === 6) {
		return (
			<RadioListStep
				eyebrow={eyebrow}
				title="What annual revenue band?"
				hint="Use 'Any / unknown' if you don't have a hard requirement."
				options={REVENUE_OPTS}
				value={state.revenueRange}
				onChange={(v) => update("revenueRange", v)}
			/>
		);
	}
	if (step === 7) {
		return (
			<RadioListStep
				eyebrow={eyebrow}
				title="How mature should the company be?"
				options={AGE_OPTS}
				value={state.companyAge}
				onChange={(v) => update("companyAge", v)}
			/>
		);
	}
	if (step === 8) {
		return (
			<MultiPicker
				eyebrow={eyebrow}
				title="What tools should they currently use?"
				hint="Select tech you want present in their stack."
				options={SALES_TECH_PRESETS}
				value={state.techStack}
				onChange={(v) => update("techStack", v)}
				placeholder="Add a tool"
			/>
		);
	}
	if (step === 9) {
		return (
			<MultiPicker
				eyebrow={eyebrow}
				title="What are they replacing or competing with?"
				hint="Helps the search prioritize accounts in active evaluation."
				options={SALES_COMPETITOR_PRESETS}
				value={state.competitors}
				onChange={(v) => update("competitors", v)}
				placeholder="Add a competitor"
			/>
		);
	}
	if (step === 10) {
		return (
			<MultiPicker
				eyebrow={eyebrow}
				title="Which buying triggers matter?"
				hint="Recent events that suggest the account is ready to buy."
				options={SALES_TRIGGER_PRESETS}
				value={state.triggers}
				onChange={(v) => update("triggers", v)}
				placeholder="Add a trigger"
			/>
		);
	}
	if (step === 11) {
		return (
			<MultiSelectStep
				eyebrow={eyebrow}
				title="Which functions are your buyers in?"
				hint="Pick one or more. Most B2B deals span 2–3."
				options={BUYER_FUNCTION_OPTS}
				value={state.buyerFunctions}
				onChange={(v) => update("buyerFunctions", v)}
			/>
		);
	}
	if (step === 12) {
		return (
			<MultiSelectStep
				eyebrow={eyebrow}
				title="What level are the decision makers?"
				hint="Pick the levels that actually sign or veto."
				options={BUYER_LEVEL_OPTS}
				value={state.buyerLevels}
				onChange={(v) => update("buyerLevels", v)}
			/>
		);
	}
	if (step === 13) {
		return (
			<RadioListStep
				eyebrow={eyebrow}
				title="How big is the buying committee?"
				options={COMMITTEE_SIZE_OPTS}
				value={state.committeeSize}
				onChange={(v) => update("committeeSize", v)}
			/>
		);
	}
	if (step === 14) {
		return (
			<RadioListStep
				eyebrow={eyebrow}
				title="What deal size do you typically close?"
				options={DEAL_SIZE_OPTS}
				value={state.dealSize}
				onChange={(v) => update("dealSize", v)}
			/>
		);
	}
	if (step === 15) {
		return (
			<RadioListStep
				eyebrow={eyebrow}
				title="What's your sales motion?"
				options={MOTION_OPTS}
				value={state.salesMotion}
				onChange={(v) => update("salesMotion", v)}
			/>
		);
	}
	if (step === 16) {
		return (
			<MustHavesStep
				eyebrow={eyebrow}
				title="Anything else that's a hard must-have?"
				hint="Kiami enforces these strictly."
				items={state.mustHaves}
				onChange={(v) => update("mustHaves", v)}
			/>
		);
	}
	if (step === 17) {
		return (
			<MustHavesStep
				eyebrow={eyebrow}
				title="Anything to explicitly exclude?"
				hint="Companies matching these will be filtered out."
				items={state.exclude}
				onChange={(v) => update("exclude", v)}
				addLabel="Add exclusion"
			/>
		);
	}
	const headcount = HEADCOUNT_OPTS.find((o) => o.id === state.headcountRange);
	const funding = FUNDING_STAGE_OPTS.find((o) => o.id === state.fundingStage);
	const revenue = REVENUE_OPTS.find((o) => o.id === state.revenueRange);
	const age = AGE_OPTS.find((o) => o.id === state.companyAge);
	const committee = COMMITTEE_SIZE_OPTS.find(
		(o) => o.id === state.committeeSize,
	);
	const deal = DEAL_SIZE_OPTS.find((o) => o.id === state.dealSize);
	const motion = MOTION_OPTS.find((o) => o.id === state.salesMotion);
	return (
		<Q
			eyebrow={eyebrow}
			title="Ready to run."
			hint="Review before Kiami goes searching."
		>
			<ReviewRows
				rows={[
					["Industry", state.industry || "—"],
					["Sub-segment", state.subSegment || "—"],
					["Headcount", headcount?.label ?? "—"],
					[
						"Geography",
						[state.geography, state.regionTags.join(" · ")]
							.filter(Boolean)
							.join(" · ") || "—",
					],
					["Funding", funding?.label ?? "—"],
					["Revenue", revenue?.label ?? "—"],
					["Company age", age?.label ?? "—"],
					["Tech stack", joinOrDash(state.techStack)],
					["Replacing", joinOrDash(state.competitors)],
					["Triggers", joinOrDash(state.triggers)],
					["Buyer functions", joinOrDash(state.buyerFunctions)],
					["Buyer levels", joinOrDash(state.buyerLevels)],
					["Committee", committee?.label ?? "—"],
					["Deal size", deal?.label ?? "—"],
					["Motion", motion?.label ?? "—"],
					[
						"Must-haves",
						`${state.mustHaves.length} requirement${state.mustHaves.length === 1 ? "" : "s"}`,
					],
					[
						"Exclude",
						`${state.exclude.length} exclusion${state.exclude.length === 1 ? "" : "s"}`,
					],
				]}
			/>
		</Q>
	);
}

function joinOrDash(arr: string[]): string {
	return arr.length ? arr.join(", ") : "—";
}

// ---------- Reusable step bits ----------

function RadioListStep({
	eyebrow,
	title,
	hint,
	options,
	value,
	onChange,
}: {
	eyebrow: string;
	title: string;
	hint?: string;
	options: { id: string; label: string; hint?: string }[];
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<Q eyebrow={eyebrow} title={title} hint={hint}>
			<div className="grid gap-2.5">
				{options.map((o) => {
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
								{o.hint && (
									<div className="text-[13px] text-muted-foreground">
										{o.hint}
									</div>
								)}
							</div>
						</label>
					);
				})}
			</div>
		</Q>
	);
}

function MultiSelectStep({
	eyebrow,
	title,
	hint,
	options,
	value,
	onChange,
}: {
	eyebrow: string;
	title: string;
	hint?: string;
	options: string[];
	value: string[];
	onChange: (v: string[]) => void;
}) {
	function toggle(o: string) {
		onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
	}
	return (
		<Q eyebrow={eyebrow} title={title} hint={hint}>
			<div className="flex flex-wrap gap-2">
				{options.map((o) => {
					const sel = value.includes(o);
					return (
						<button
							type="button"
							key={o}
							onClick={() => toggle(o)}
							className={cn(
								"rounded-full border px-3.5 py-1.5 text-sm transition-colors",
								sel
									? "border-[var(--color-brand)] bg-[var(--color-brand-tint)] text-foreground"
									: "border-border bg-card text-muted-foreground hover:text-foreground",
							)}
						>
							{o}
						</button>
					);
				})}
			</div>
		</Q>
	);
}

function MultiPicker({
	eyebrow,
	title,
	hint,
	options,
	value,
	onChange,
	placeholder,
}: {
	eyebrow: string;
	title: string;
	hint?: string;
	options: string[];
	value: string[];
	onChange: (v: string[]) => void;
	placeholder?: string;
}) {
	const [draft, setDraft] = useState("");
	function add(t: string) {
		const v = t.trim();
		if (!v || value.includes(v)) return;
		onChange([...value, v]);
		setDraft("");
	}
	function remove(t: string) {
		onChange(value.filter((x) => x !== t));
	}
	return (
		<Q eyebrow={eyebrow} title={title} hint={hint}>
			<div className="mb-3 flex flex-wrap gap-2">
				{options.map((o) => {
					const sel = value.includes(o);
					return (
						<button
							type="button"
							key={o}
							onClick={() => (sel ? remove(o) : add(o))}
							className={cn(
								"rounded-full border px-3.5 py-1.5 text-sm transition-colors",
								sel
									? "border-[var(--color-brand)] bg-[var(--color-brand-tint)] text-foreground"
									: "border-border bg-card text-muted-foreground hover:text-foreground",
							)}
						>
							{o}
						</button>
					);
				})}
			</div>
			<div className="flex items-center gap-2">
				<Input
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							add(draft);
						}
					}}
					placeholder={placeholder ?? "Add custom"}
					className="h-10"
				/>
				<Button
					type="button"
					variant="outline"
					onClick={() => add(draft)}
					className="gap-1.5"
				>
					<Plus size={14} weight="bold" />
					Add
				</Button>
			</div>
			{value.filter((v) => !options.includes(v)).length > 0 && (
				<div className="mt-3 flex flex-wrap gap-2">
					{value
						.filter((v) => !options.includes(v))
						.map((t) => (
							<span
								key={t}
								className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm"
							>
								{t}
								<button
									type="button"
									onClick={() => remove(t)}
									className="text-muted-foreground hover:text-destructive"
									aria-label={`Remove ${t}`}
								>
									<Trash size={12} />
								</button>
							</span>
						))}
				</div>
			)}
		</Q>
	);
}

function MustHavesStep({
	eyebrow,
	title,
	hint,
	items,
	onChange,
	addLabel = "Add requirement",
}: {
	eyebrow: string;
	title: string;
	hint?: string;
	items: string[];
	onChange: (v: string[]) => void;
	addLabel?: string;
}) {
	const [draft, setDraft] = useState("");
	function add() {
		const v = draft.trim();
		if (!v) return;
		onChange([...items, v]);
		setDraft("");
	}
	function remove(i: number) {
		onChange(items.filter((_, idx) => idx !== i));
	}
	return (
		<Q eyebrow={eyebrow} title={title} hint={hint}>
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
							aria-label="Remove"
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
						placeholder={addLabel}
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

function TagPicker({
	tags,
	value,
	onChange,
	className,
}: {
	tags: string[];
	value: string[];
	onChange: (v: string[]) => void;
	className?: string;
}) {
	function toggle(t: string) {
		onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
	}
	return (
		<div className={cn("flex flex-wrap gap-2", className)}>
			{tags.map((t) => {
				const sel = value.includes(t);
				return (
					<Badge
						key={t}
						variant={sel ? "default" : "secondary"}
						className="cursor-pointer py-1.5"
						onClick={() => toggle(t)}
					>
						{t}
					</Badge>
				);
			})}
		</div>
	);
}

function ReviewRows({ rows }: { rows: Array<[string, string]> }) {
	return (
		<div className="grid gap-2">
			{rows.map(([k, v]) => (
				<div
					key={k}
					className="flex items-center justify-between gap-4 rounded-xl bg-muted px-4 py-2.5"
				>
					<span className="text-[12px] font-medium text-muted-foreground">
						{k}
					</span>
					<span className="truncate text-right text-[13px] font-medium text-foreground">
						{v || "—"}
					</span>
				</div>
			))}
		</div>
	);
}

// ---------- Brief composers ----------

function composeRecBrief(s: RecState): string {
	const sen = SENIORITY_OPTS.find((x) => x.id === s.seniorityId);
	const lines: string[] = [];
	lines.push(`Flow: Recruiting`);
	lines.push(`Role: ${s.role}`);
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

function composeSalesBrief(s: SalesState): string {
	const headcount = HEADCOUNT_OPTS.find((o) => o.id === s.headcountRange);
	const funding = FUNDING_STAGE_OPTS.find((o) => o.id === s.fundingStage);
	const revenue = REVENUE_OPTS.find((o) => o.id === s.revenueRange);
	const age = AGE_OPTS.find((o) => o.id === s.companyAge);
	const committee = COMMITTEE_SIZE_OPTS.find((o) => o.id === s.committeeSize);
	const deal = DEAL_SIZE_OPTS.find((o) => o.id === s.dealSize);
	const motion = MOTION_OPTS.find((o) => o.id === s.salesMotion);

	const lines: string[] = [];
	lines.push("Flow: Lead Finder");
	lines.push(`Industry: ${s.industry}`);
	if (s.subSegment) lines.push(`Sub-segment: ${s.subSegment}`);
	if (headcount) lines.push(`Headcount: ${headcount.label}`);
	if (s.geography || s.regionTags.length) {
		const geo = [s.geography, ...s.regionTags].filter(Boolean).join(" · ");
		lines.push(`Geography: ${geo}`);
	}
	if (funding && funding.id !== "any") lines.push(`Funding: ${funding.label}`);
	if (revenue && revenue.id !== "any") lines.push(`Revenue: ${revenue.label}`);
	if (age && age.id !== "any") lines.push(`Company age: ${age.label}`);
	if (s.techStack.length) lines.push(`Currently using: ${s.techStack.join(", ")}`);
	if (s.competitors.length)
		lines.push(`Replacing / competing with: ${s.competitors.join(", ")}`);
	if (s.triggers.length) lines.push(`Triggers: ${s.triggers.join(", ")}`);
	if (s.buyerFunctions.length)
		lines.push(`Buyer functions: ${s.buyerFunctions.join(", ")}`);
	if (s.buyerLevels.length)
		lines.push(`Buyer levels: ${s.buyerLevels.join(", ")}`);
	if (committee) lines.push(`Buying committee: ${committee.label}`);
	if (deal) lines.push(`Deal size: ${deal.label}`);
	if (motion) lines.push(`Sales motion: ${motion.label}`);
	if (s.mustHaves.length) {
		lines.push("Must-haves:");
		for (const m of s.mustHaves) lines.push(`- ${m}`);
	}
	if (s.exclude.length) {
		lines.push("Exclude:");
		for (const m of s.exclude) lines.push(`- ${m}`);
	}
	return lines.join("\n");
}
