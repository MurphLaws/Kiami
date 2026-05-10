import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	ArrowLeft,
} from "@phosphor-icons/react";
import { FocusedHeader } from "@/components/kiami/focused-header";
import { KiamiMark } from "@/components/kiami/logo";
import { useMode, flowLabel } from "@/components/kiami/flow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/new/")({
	component: ModePicker,
});

function ModePicker() {
	const { flow } = useMode();
	const isRec = flow === "recruiting";

	const pasteDesc = isRec
		? "Paste a job description (or a LinkedIn job-listing URL) and Kiami will infer role, seniority, location, and must-haves."
		: "Paste an ICP one-pager and Kiami will extract segments, titles, intent signals, and account criteria.";
	const formDesc = isRec
		? "Walk through 5 short steps. Best when you want explicit control over each criterion."
		: "Walk through targeting one decision at a time — segment, geography, company stage, signals.";
	const pasteBullets = isRec
		? [
				"Detects role + seniority",
				"Extracts must-haves vs nice-to-haves",
				"Pulls from LinkedIn URLs",
			]
		: [
				"Extracts firmographics",
				"Pulls intent triggers",
				"Editable before run",
			];
	const formBullets = isRec
		? ["One question per page", "No JD required", "Save as a template"]
		: [
				"Granular ABM rules",
				"No deck or doc needed",
				"Save as a template",
			];

	return (
		<div className="relative min-h-screen overflow-hidden bg-muted">
			<MascotWatermark />
			<FocusedHeader />
			<div className="relative mx-auto max-w-[1040px] px-8 pt-10 pb-16">
				<div className="mb-7">
					<Link
						to="/dashboard"
						className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
					>
						<ArrowLeft size={13} />
						Back to searches
					</Link>
				</div>

				<div className="mb-10">
					<span
						className="font-mono-display text-[11px] font-medium tracking-[0.18em] uppercase"
						style={{ color: "var(--color-brand)" }}
					>
						New {flowLabel(flow)} search
					</span>
					<h1 className="mt-3 font-heading text-[44px] font-semibold leading-[1.05] tracking-[-0.025em] text-foreground">
						{isRec ? "Tell Kiami who to hire." : "Tell Kiami who to reach."}
					</h1>
					<p className="mt-3 max-w-[560px] text-[16px] text-muted-foreground">
						Pick how you want to describe the search. You can switch modes any
						time from the sidebar.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
					<ModeCard
						to="/new/paste"
						number="01"
						title={isRec ? "Paste a job listing" : "Paste your ICP"}
						desc={pasteDesc}
						bullets={pasteBullets}
						recommended
					/>
					<ModeCard
						to="/new/form"
						number="02"
						title="Step-by-step form"
						desc={formDesc}
						bullets={formBullets}
					/>
				</div>
			</div>
		</div>
	);
}

function ModeCard({
	to,
	number,
	title,
	desc,
	bullets,
	recommended,
}: {
	to: string;
	number: string;
	title: string;
	desc: string;
	bullets: string[];
	recommended?: boolean;
}) {
	return (
		<Link
			to={to}
			className={cn(
				"group relative flex flex-col gap-5 border bg-card p-7 text-left transition-all",
				"rounded-[14px] hover:border-[var(--color-brand)] hover:shadow-md",
			)}
		>
			<div className="flex items-start justify-between">
				<span
					className="font-mono-display text-[14px] tracking-[0.04em] tnum"
					style={{ color: "var(--color-brand)" }}
				>
					{number}
				</span>
				{recommended && (
					<span
						className="inline-flex items-center gap-1.5 font-mono-display text-[10px] font-medium tracking-[0.18em] uppercase"
						style={{ color: "var(--color-brand)" }}
					>
						<span
							className="inline-block h-1 w-1 rounded-full"
							style={{ background: "var(--color-brand)" }}
						/>
						Recommended
					</span>
				)}
			</div>

			<div>
				<div className="font-heading text-[24px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
					{title}
				</div>
				<p className="mt-2 text-[14px] leading-snug text-muted-foreground">
					{desc}
				</p>
			</div>

			<ul className="grid gap-2 border-t pt-4">
				{bullets.map((b) => (
					<li
						key={b}
						className="flex items-start gap-3 text-[13px] text-foreground"
					>
						<span
							className="mt-[7px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
							style={{ background: "var(--color-brand)" }}
						/>
						{b}
					</li>
				))}
			</ul>

			<div
				className="mt-auto inline-flex items-center gap-1.5 text-[13px] font-medium transition-transform group-hover:translate-x-0.5"
				style={{ color: "var(--color-brand)" }}
			>
				Continue
				<ArrowRight size={13} weight="bold" />
			</div>
		</Link>
	);
}

function MascotWatermark() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute -right-40 -bottom-44 select-none"
			style={{ color: "var(--color-brand)", opacity: 0.05 }}
		>
			<KiamiMark size={680} plate={false} />
		</div>
	);
}
