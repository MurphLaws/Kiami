import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	ArrowLeft,
	Check,
	Note,
	ListChecks,
} from "@phosphor-icons/react";
import { FocusedHeader } from "@/components/kiami/focused-header";
import { IconTile } from "@/components/kiami/icon-tile";
import { useMode, flowLabel } from "@/components/kiami/flow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/new/")({
	component: ModePicker,
});

function ModePicker() {
	const { flow } = useMode();
	const isRec = flow === "recruiting";

	const pasteDesc = isRec
		? "Paste a job description and Kiami will infer role, seniority, location, and must-haves."
		: "Paste an ICP or one-pager — Kiami extracts segments, titles, intent signals, and account criteria.";
	const formDesc = isRec
		? "Walk through 5 short steps. Best when you want explicit control over each criterion."
		: "Walk through targeting one decision at a time — segment, geography, company stage, signals.";
	const pasteBullets = isRec
		? [
				"Detects role + seniority",
				"Surfaces must-haves vs nice-to-haves",
				"Editable before run",
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
		<div className="min-h-screen bg-muted">
			<FocusedHeader />
			<div className="mx-auto max-w-[960px] px-8 pt-10 pb-16">
				<div className="mb-7">
					<Link
						to="/dashboard"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft size={14} />
						Back to searches
					</Link>
				</div>
				<div className="mb-7">
					<span className="text-[12px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
						New {flowLabel(flow)} search
					</span>
					<h1 className="mt-2 mb-2 font-heading text-[40px] font-semibold leading-tight tracking-tight">
						{isRec ? "Tell Kiami who to hire." : "Tell Kiami who to reach."}
					</h1>
					<p className="text-[17px] text-muted-foreground">
						Pick how you want to describe the search. You can switch modes any
						time from the sidebar.
					</p>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<ModeCard
						to="/new/paste"
						Icon={Note}
						tone={isRec ? "peach" : "coral"}
						title={isRec ? "Paste a job listing" : "Paste your ICP"}
						desc={pasteDesc}
						bullets={pasteBullets}
						recommended
					/>
					<ModeCard
						to="/new/form"
						Icon={ListChecks}
						tone="brand"
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
	Icon,
	tone,
	title,
	desc,
	bullets,
	recommended,
}: {
	to: string;
	Icon: React.ComponentType<{ size?: number; weight?: "regular" | "fill" }>;
	tone: "peach" | "coral" | "brand";
	title: string;
	desc: string;
	bullets: string[];
	recommended?: boolean;
}) {
	return (
		<Link
			to={to}
			className={cn(
				"relative flex flex-col gap-4 rounded-2xl border bg-card p-7 text-left transition-all hover:border-[var(--color-border-strong)] hover:shadow-lg",
			)}
		>
			{recommended && (
				<span
					className="absolute top-4 right-4 text-[11px] font-semibold tracking-[0.08em] uppercase"
					style={{ color: "var(--color-brand)" }}
				>
					Recommended
				</span>
			)}
			<IconTile tone={tone} size="lg">
				<Icon size={22} weight="regular" />
			</IconTile>
			<div>
				<div className="font-heading text-[22px] font-semibold leading-tight tracking-tight">
					{title}
				</div>
				<div className="mt-1.5 text-[15px] text-muted-foreground">{desc}</div>
			</div>
			<ul className="grid gap-2">
				{bullets.map((b) => (
					<li
						key={b}
						className="flex items-start gap-2.5 text-[13px]"
						style={{ color: "var(--color-ink-2)" }}
					>
						<Check
							size={16}
							weight="bold"
							color="var(--color-brand)"
							className="mt-0.5 shrink-0"
						/>
						{b}
					</li>
				))}
			</ul>
			<div
				className="mt-auto flex items-center gap-2 text-sm font-medium"
				style={{ color: "var(--color-brand)" }}
			>
				Continue
				<ArrowRight size={14} weight="bold" />
			</div>
		</Link>
	);
}
