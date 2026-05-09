import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
	MagnifyingGlass,
	Plus,
	Gear,
	Export,
	List as ListIcon,
	Tray,
	Database,
	GitBranch,
	DotsThree,
	Sparkle,
} from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KiamiLogo } from "@/components/kiami/logo";
import { TypePill } from "@/components/kiami/type-pill";
import { StatusPill, type Status } from "@/components/kiami/status-pill";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
	component: DashboardPage,
});

type Search = {
	id: number;
	name: string;
	flow: "recruiting" | "sales";
	status: Status;
	matches: number;
	updated: string;
	owner: string;
	initials: string;
};

const SEARCHES: Search[] = [
	{
		id: 1,
		name: "Senior backend · Berlin · fintech",
		flow: "recruiting",
		status: "running",
		matches: 124,
		updated: "3m ago",
		owner: "Lena Marín",
		initials: "LM",
	},
	{
		id: 2,
		name: "Series-A HR-tech decision makers",
		flow: "sales",
		status: "running",
		matches: 86,
		updated: "12m ago",
		owner: "Tomás Yamazaki",
		initials: "TY",
	},
	{
		id: 3,
		name: "Healthtech CFOs · post-Series-B",
		flow: "sales",
		status: "running",
		matches: 58,
		updated: "1h ago",
		owner: "Jordan Mata",
		initials: "JM",
	},
	{
		id: 4,
		name: "Staff PM, marketplaces, EU remote",
		flow: "recruiting",
		status: "paused",
		matches: 41,
		updated: "Yesterday",
		owner: "Rita Okafor",
		initials: "RO",
	},
	{
		id: 5,
		name: "VP Marketing — vertical SaaS, 100–500ee",
		flow: "sales",
		status: "running",
		matches: 33,
		updated: "4h ago",
		owner: "Tomás Yamazaki",
		initials: "TY",
	},
	{
		id: 6,
		name: "iOS engineers · Latam · Spanish-fluent",
		flow: "recruiting",
		status: "draft",
		matches: 0,
		updated: "2d ago",
		owner: "Ana Silva",
		initials: "AS",
	},
];

function DashboardPage() {
	const [tab, setTab] = useState("all");
	const [empty, setEmpty] = useState(false);

	return (
		<div className="flex min-h-screen bg-background">
			<SideNav />
			<main className="flex flex-1 flex-col bg-background">
				<PageHeader />
				{!empty && <Toolbar tab={tab} setTab={setTab} />}
				{empty ? (
					<EmptyState onCreate={() => setEmpty(false)} />
				) : (
					<div className="flex-1 px-6 py-5">
						<SearchTable rows={SEARCHES} />
						<TableFooter />
						<div className="mt-6">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setEmpty(true)}
							>
								Show empty state
							</Button>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}

function SideNav() {
	const items: Array<[string, string, React.ComponentType<{ size?: number }>, string?]> = [
		["searches", "Searches", ListIcon],
		["inbox", "Inbox", Tray, "3"],
		["accounts", "Accounts", Database],
		["integrations", "Integrations", GitBranch],
	];
	return (
		<aside className="flex w-[232px] flex-col border-r bg-muted">
			<div className="flex items-center justify-between px-4 py-3.5">
				<KiamiLogo size={18} />
				<button className="p-1 text-muted-foreground hover:text-foreground">
					<Gear size={14} />
				</button>
			</div>
			<div className="px-2.5 pb-2.5">
				<Link
					to="/new"
					className={cn(buttonVariants(), "w-full justify-between")}
				>
					<span className="flex items-center gap-2">
						<Plus size={14} weight="bold" />
						New search
					</span>
					<span className="rounded border border-white/30 px-1.5 py-0.5 font-mono-display text-[11px] opacity-70">
						⌘N
					</span>
				</Link>
			</div>
			<nav className="grid gap-px px-2.5 py-1.5">
				{items.map(([id, label, Icon, badge]) => (
					<a
						key={id}
						href="#"
						className={cn(
							"flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
							id === "searches"
								? "bg-card font-medium text-foreground shadow-xs"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon size={15} />
						<span className="flex-1">{label}</span>
						{badge && (
							<span className="text-[11px] font-medium text-muted-foreground">
								{badge}
							</span>
						)}
					</a>
				))}
			</nav>
			<div className="px-4 pt-3.5 pb-1 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground/70 uppercase">
				Workspaces
			</div>
			<nav className="grid gap-px px-2.5">
				{[
					["Recruiting", "var(--color-peach-icon)", "4"],
					["Sales GTM", "var(--color-coral-icon)", "2"],
				].map(([label, color, count]) => (
					<a
						key={label}
						href="#"
						className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-card"
					>
						<span
							className="h-2 w-2 rounded-sm"
							style={{ background: color }}
						/>
						<span className="flex-1">{label}</span>
						<span className="text-[11px] text-muted-foreground">{count}</span>
					</a>
				))}
			</nav>
			<div className="mt-auto flex items-center gap-2.5 border-t px-3.5 py-2.5 text-sm">
				<div
					className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold text-white"
					style={{ background: "var(--color-brand)" }}
				>
					JM
				</div>
				<div className="leading-tight">
					<div className="font-medium text-foreground">Jordan Mata</div>
					<div className="text-[11px] text-muted-foreground">
						Northwind Workspace
					</div>
				</div>
			</div>
		</aside>
	);
}

function PageHeader() {
	return (
		<div className="flex items-center justify-between border-b bg-background px-6 py-3.5">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<ListIcon size={14} />
				<span>Searches</span>
				<span>/</span>
				<span className="font-medium text-foreground">All</span>
			</div>
			<div className="flex items-center gap-1.5">
				<Button variant="ghost" size="sm" className="gap-1.5">
					<Export size={14} />
					Export
				</Button>
				<span className="h-4 w-px bg-border" />
				<Link
					to="/new"
					className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
				>
					<Plus size={14} weight="bold" />
					New search
				</Link>
			</div>
		</div>
	);
}

function Toolbar({
	tab,
	setTab,
}: {
	tab: string;
	setTab: (v: string) => void;
}) {
	const tabs: Array<[string, string, number]> = [
		["all", "All", 6],
		["recruiting", "Recruiting", 4],
		["sales", "Sales GTM", 2],
		["drafts", "Drafts", 1],
	];
	return (
		<div className="flex items-center justify-between gap-4 border-b bg-background px-6 py-2.5">
			<div className="flex items-center gap-0.5">
				{tabs.map(([id, label, n]) => {
					const active = tab === id;
					return (
						<button
							key={id}
							onClick={() => setTab(id)}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
								active
									? "bg-muted font-medium text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{label}
							<span
								className={cn(
									"min-w-5 rounded px-1.5 text-center text-[11px]",
									active ? "border bg-card" : "text-muted-foreground",
								)}
							>
								{n}
							</span>
						</button>
					);
				})}
			</div>
			<div className="flex items-center gap-2">
				<div className="relative">
					<MagnifyingGlass
						size={13}
						className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						placeholder="Search…"
						className="h-8 w-[220px] rounded-md pl-8 pr-12 text-[13px]"
					/>
					<span className="absolute top-1/2 right-2 -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 font-mono-display text-[11px] text-muted-foreground">
						⌘K
					</span>
				</div>
				<Button variant="outline" size="sm" className="gap-1.5">
					<Gear size={13} />
					Filter
				</Button>
				<Button variant="outline" size="sm" className="px-2">
					<DotsThree size={14} weight="bold" />
				</Button>
			</div>
		</div>
	);
}

function SearchTable({ rows }: { rows: Search[] }) {
	return (
		<div className="overflow-hidden rounded-lg border bg-card">
			<div className="grid grid-cols-[24px_minmax(0,1fr)_120px_110px_90px_130px_36px] items-center gap-4 border-b bg-muted px-4 py-2 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
				<span />
				<span>Search</span>
				<span>Type</span>
				<span>Status</span>
				<span className="text-right">Matches</span>
				<span>Updated</span>
				<span />
			</div>
			{rows.map((s, i) => (
				<div
					key={s.id}
					className={cn(
						"grid grid-cols-[24px_minmax(0,1fr)_120px_110px_90px_130px_36px] items-center gap-4 px-4 py-3.5 text-sm transition-colors hover:bg-muted/50",
						i < rows.length - 1 && "border-b",
					)}
				>
					<span
						className="h-1.5 w-1.5 rounded-full"
						style={{
							background:
								s.flow === "recruiting"
									? "var(--color-peach-icon)"
									: "var(--color-coral-icon)",
						}}
					/>
					<div className="min-w-0">
						<div className="truncate font-medium text-foreground">
							{s.name}
						</div>
						<div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
							<span
								className="inline-grid h-4 w-4 place-items-center rounded-full bg-muted text-[9px] font-semibold text-foreground/80"
								style={{ background: "var(--color-brand-tint)" }}
							>
								{s.initials}
							</span>
							{s.owner}
						</div>
					</div>
					<TypePill flow={s.flow} />
					<StatusPill status={s.status} />
					<span
						className={cn(
							"text-right font-medium tabular-nums",
							s.matches ? "text-foreground" : "text-muted-foreground",
						)}
					>
						{s.matches || "—"}
					</span>
					<span className="text-[13px] text-muted-foreground">
						{s.updated}
					</span>
					<button className="justify-self-end p-1.5 text-muted-foreground hover:text-foreground">
						<DotsThree size={16} weight="bold" />
					</button>
				</div>
			))}
		</div>
	);
}

function TableFooter() {
	return (
		<div className="flex items-center justify-between px-1 py-3 text-[12px] text-muted-foreground">
			<span>Showing 6 of 6</span>
			<div className="flex items-center gap-1">
				<button className="px-2 py-1 hover:text-foreground">‹</button>
				<span>1 / 1</span>
				<button className="px-2 py-1 hover:text-foreground">›</button>
			</div>
		</div>
	);
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
	return (
		<div className="grid flex-1 place-items-center px-6 py-10">
			<div className="max-w-[420px] text-center">
				<div
					className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl"
					style={{
						background: "var(--color-brand-tint)",
						color: "var(--color-brand)",
					}}
				>
					<MagnifyingGlass size={22} />
				</div>
				<h2 className="mb-2 font-heading text-[32px] font-semibold leading-tight tracking-tight">
					No searches yet
				</h2>
				<p className="mx-auto mb-5 max-w-[340px] text-[15px] text-muted-foreground">
					Describe who you're looking for in plain English — Kiami builds the
					filters and runs the search for you.
				</p>
				<div className="flex justify-center gap-2">
					<Link to="/new" className={cn(buttonVariants(), "gap-1.5")}>
						<Plus size={14} weight="bold" />
						New search
					</Link>
					<Button variant="outline" onClick={onCreate}>
						Watch a 2-min demo
					</Button>
				</div>
				<div className="mt-7 flex flex-wrap justify-center gap-2">
					{[
						"Senior backend in Berlin",
						"Series-A HR-tech buyers",
						"Staff PM · EU remote",
					].map((t) => (
						<Badge key={t} variant="secondary" className="gap-1.5 py-1">
							<Sparkle
								size={12}
								weight="fill"
								color="var(--color-brand)"
							/>
							{t}
						</Badge>
					))}
				</div>
			</div>
		</div>
	);
}
