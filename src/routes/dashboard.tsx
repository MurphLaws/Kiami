import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Phone,
	UploadSimple,
	ArrowRight,
} from "@phosphor-icons/react";
import { KiamiLogo, KiamiMark } from "@/components/kiami/logo";

export const Route = createFileRoute("/dashboard")({
	component: DashboardPage,
});

const RECENT_CALLS = [
	{
		name: "Léa Marín",
		title: "VP of People · Pennylane",
		when: "12 min ago",
		status: "Connected",
	},
	{
		name: "Tomás Yamazaki",
		title: "Head of HR · Alma",
		when: "1h ago",
		status: "Voicemail",
	},
	{
		name: "Jordan Mata",
		title: "Director of Talent · Northwind",
		when: "Today, 09:42",
		status: "Booked",
	},
	{
		name: "Rita Okafor",
		title: "Chief People Officer · Beam",
		when: "Yesterday",
		status: "Follow-up",
	},
	{
		name: "Ana Silva",
		title: "Recruiting Lead · Trafilea",
		when: "Yesterday",
		status: "Connected",
	},
] as const;

const UP_NEXT = [
	{ time: "11:30", who: "Discovery — Pennylane (Léa Marín)" },
	{ time: "14:00", who: "Follow-up — Beam (Rita Okafor)" },
	{ time: "16:15", who: "Intro — Alma (Tomás Yamazaki)" },
] as const;

const METRICS: Array<{ label: string; value: string; delta: string }> = [
	{ label: "Calls scheduled this week", value: "32", delta: "+12% vs last week" },
	{ label: "Connected rate", value: "47%", delta: "+4 pts" },
	{ label: "Briefs generated", value: "08", delta: "this morning" },
	{ label: "Leads in pipeline", value: "164", delta: "+22 today" },
];

function DashboardPage() {
	return (
		<div className="min-h-screen bg-paper text-ink">
			<TopNav />
			<main className="mx-auto max-w-[1200px] px-8 pt-10 pb-16">
				<HeroBlock />
				<MetricsStrip />
				<div className="mt-14 grid gap-12 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
					<RecentCalls />
					<UpNext />
				</div>
			</main>
		</div>
	);
}

function TopNav() {
	return (
		<header className="sticky top-0 z-30 flex h-16 items-center border-b border-hairline bg-paper/95 backdrop-blur-md">
			<div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-8">
				<Link to="/dashboard" aria-label="kiami home">
					<KiamiLogo size={22} />
				</Link>
				<nav className="flex items-center gap-7 text-[13px]">
					<Link
						to="/dashboard"
						className="font-medium text-ink"
						activeProps={{ className: "font-medium text-ink" }}
					>
						Today
					</Link>
					<Link
						to="/results"
						className="text-slate transition-colors hover:text-ink"
						activeProps={{ className: "font-medium text-ink" }}
					>
						Contacts
					</Link>
					<Link
						to="/new"
						className="ml-3 inline-flex items-center gap-1.5 rounded-[4px] bg-cobalt px-3.5 py-1.5 text-[13px] font-medium text-paper transition-colors hover:bg-deep"
					>
						<Phone size={13} weight="bold" />
						Start a call
					</Link>
				</nav>
			</div>
		</header>
	);
}

function HeroBlock() {
	const today = new Date();
	const date = today.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
	const hours = today.getHours();
	const greeting =
		hours < 12 ? "Good morning" : hours < 18 ? "Good afternoon" : "Good evening";

	return (
		<section className="flex flex-wrap items-end justify-between gap-6">
			<div>
				<span className="eyebrow">{date}</span>
				<h1
					className="mt-2 text-ink"
					style={{
						fontSize: "var(--type-h1)",
						fontWeight: 700,
						letterSpacing: "-0.025em",
						lineHeight: 1.1,
					}}
				>
					{greeting}, Jordan.
				</h1>
				<p className="mt-2 max-w-[420px] text-[14px] text-slate">
					Eight new briefs are ready. Three follow-ups expect a call back today.
				</p>
			</div>
			<div className="flex items-center gap-2">
				<Link
					to="/new"
					className="inline-flex items-center gap-1.5 rounded-[4px] bg-cobalt px-4 py-2 text-[13px] font-medium text-paper transition-colors hover:bg-deep"
				>
					<Phone size={13} weight="bold" />
					Start a call
				</Link>
				<button
					type="button"
					className="inline-flex items-center gap-1.5 rounded-[4px] border border-ink bg-paper px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-mist"
				>
					<UploadSimple size={13} weight="bold" />
					Import contacts
				</button>
			</div>
		</section>
	);
}

function MetricsStrip() {
	return (
		<section className="mt-12 grid grid-cols-2 border-y border-hairline md:grid-cols-4">
			{METRICS.map((m, i) => (
				<div
					key={m.label}
					className={
						"flex flex-col gap-2 px-6 py-7 " +
						(i < METRICS.length - 1
							? "border-r border-hairline last:border-r-0 md:border-r"
							: "")
					}
				>
					<span className="eyebrow">{m.label}</span>
					<span
						className="font-mono-display tnum text-ink"
						style={{
							fontSize: "var(--type-display-lg)",
							fontWeight: 500,
							lineHeight: 1,
							letterSpacing: "-0.02em",
						}}
					>
						{m.value}
					</span>
					<span className="font-mono-display tnum text-[12px] text-cobalt">
						{m.delta}
					</span>
				</div>
			))}
		</section>
	);
}

function RecentCalls() {
	return (
		<section>
			<div className="mb-3 flex items-baseline justify-between border-t border-hairline pt-4">
				<span className="eyebrow">Recent calls</span>
				<Link
					to="/results"
					className="inline-flex items-center gap-1 font-mono-display text-[11px] tracking-[0.18em] text-cobalt uppercase transition-colors hover:text-deep"
				>
					Open contacts
					<ArrowRight size={11} weight="bold" />
				</Link>
			</div>
			<div>
				{RECENT_CALLS.map((c, i) => (
					<RecentRow key={i} {...c} />
				))}
			</div>
		</section>
	);
}

function RecentRow({
	name,
	title,
	when,
	status,
}: {
	name: string;
	title: string;
	when: string;
	status: string;
}) {
	const dotColor =
		status === "Connected" || status === "Booked"
			? "var(--cobalt)"
			: status === "Voicemail"
				? "var(--sky)"
				: "var(--hairline)";
	return (
		<div className="grid grid-cols-[28px_minmax(0,1fr)_140px_120px] items-center gap-4 border-b border-hairline px-1 py-3.5 transition-colors hover:bg-mist/60">
			<div className="grid h-7 w-7 place-items-center rounded-full bg-mist text-[10px] font-semibold text-cobalt">
				{name
					.split(" ")
					.map((s) => s[0])
					.slice(0, 2)
					.join("")}
			</div>
			<div className="min-w-0">
				<div className="truncate text-[14px] font-medium text-ink">{name}</div>
				<div className="truncate text-[12px] text-slate">{title}</div>
			</div>
			<div className="font-mono-display tnum text-[12px] text-slate">
				{when}
			</div>
			<div className="flex items-center gap-2 text-[12px] text-slate">
				<span
					className="inline-block h-1.5 w-1.5 rounded-full"
					style={{ background: dotColor }}
				/>
				{status}
			</div>
		</div>
	);
}

function UpNext() {
	return (
		<section>
			<div className="mb-3 border-t border-hairline pt-4">
				<span className="eyebrow">Up next</span>
			</div>
			<div>
				{UP_NEXT.map((u) => (
					<div
						key={u.time}
						className="grid grid-cols-[60px_minmax(0,1fr)] items-center gap-4 border-b border-hairline py-3.5"
					>
						<span className="font-mono-display tnum text-[12px] text-slate">
							{u.time}
						</span>
						<span className="truncate text-[13px] text-ink">{u.who}</span>
					</div>
				))}
			</div>
			<div className="mt-6 flex items-center gap-3 rounded-[8px] border border-hairline bg-mist/40 px-4 py-3">
				<div style={{ color: "var(--cobalt)" }}>
					<KiamiMark size={36} />
				</div>
				<div className="flex-1">
					<div className="text-[13px] font-medium text-ink">
						kiami can dial these for you.
					</div>
					<div className="mt-0.5 text-[11px] text-slate">
						Each call opens with the brief Kiami prepared.
					</div>
				</div>
			</div>
		</section>
	);
}
