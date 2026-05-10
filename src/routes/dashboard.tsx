import { createFileRoute, Link } from "@tanstack/react-router";
import {
	MagnifyingGlass,
	Plus,
	Gear,
	List as ListIcon,
	Tray,
	Database,
	GitBranch,
	Sparkle,
} from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KiamiLogo } from "@/components/kiami/logo";
import { useMode, type Flow } from "@/components/kiami/flow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const { flow, setFlow } = useMode();
	const isRecruiting = flow === "recruiting";

	return (
		<div className="flex min-h-screen bg-background">
			<SideNav />
			<main
				className={cn(
					"relative flex flex-1 flex-col overflow-hidden transition-colors duration-500",
					isRecruiting
						? "bg-[var(--color-brand)] text-white"
						: "bg-white text-[var(--color-brand)]",
				)}
			>
				<TopBar value={flow} onChange={setFlow} />
				<div
					key={flow}
					className={cn(
						"flex flex-1 flex-col",
						isRecruiting
							? "kiami-slide-from-left"
							: "kiami-slide-from-right",
					)}
				>
					<EmptyState flow={flow} />
				</div>
			</main>
		</div>
	);
}

function SideNav() {
	const items: Array<
		[string, string, React.ComponentType<{ size?: number }>, string?]
	> = [
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

function TopBar({
	value,
	onChange,
}: {
	value: Flow;
	onChange: (f: Flow) => void;
}) {
	return (
		<div
			className={cn(
				"relative flex items-center justify-between border-b px-6 py-4 transition-colors duration-500",
				value === "recruiting"
					? "border-white/15 bg-[var(--color-brand-2)]/30"
					: "border-[var(--color-brand)]/15 bg-[var(--color-brand-tint)]/40",
			)}
		>
			<div className="w-[160px]" />
			<div className="absolute left-1/2 -translate-x-1/2">
				<ModeSwitch value={value} onChange={onChange} />
			</div>
			<div className="flex w-[160px] items-center justify-end gap-1.5">
				<Link
					to="/new"
					className={cn(
						"inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
						value === "recruiting"
							? "border-white/30 bg-white/10 text-white hover:bg-white/15"
							: "border-[var(--color-brand)]/25 bg-white text-[var(--color-brand)] hover:bg-[var(--color-brand-tint)]",
					)}
				>
					<Plus size={14} weight="bold" />
					New search
				</Link>
			</div>
		</div>
	);
}

function ModeSwitch({
	value,
	onChange,
}: {
	value: Flow;
	onChange: (f: Flow) => void;
}) {
	const isRecruiting = value === "recruiting";
	return (
		<div
			className={cn(
				"relative inline-grid h-10 grid-cols-2 items-center rounded-full p-1 transition-colors duration-500",
				isRecruiting
					? "bg-white/15 ring-1 ring-white/30"
					: "bg-[var(--color-brand-tint)] ring-1 ring-[var(--color-brand)]/20",
			)}
			style={{ width: 280 }}
		>
			<span
				aria-hidden
				className={cn(
					"pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
					isRecruiting
						? "translate-x-0 bg-white shadow-md"
						: "translate-x-full bg-[var(--color-brand)] shadow-md",
				)}
			/>
			<button
				type="button"
				onClick={() => onChange("recruiting")}
				className={cn(
					"relative z-10 rounded-full px-4 text-sm font-semibold transition-colors duration-300",
					isRecruiting
						? "text-[var(--color-brand)]"
						: "text-[var(--color-brand)]/70 hover:text-[var(--color-brand)]",
				)}
			>
				Recruiting
			</button>
			<button
				type="button"
				onClick={() => onChange("sales")}
				className={cn(
					"relative z-10 rounded-full px-4 text-sm font-semibold transition-colors duration-300",
					!isRecruiting
						? "text-white"
						: "text-white/80 hover:text-white",
				)}
			>
				Leads
			</button>
		</div>
	);
}

function EmptyState({ flow }: { flow: Flow }) {
	const isRecruiting = flow === "recruiting";
	const examples = isRecruiting
		? [
				"Senior backend in Berlin",
				"Staff PM · EU remote",
				"iOS · Spanish-fluent",
			]
		: [
				"Series-A HR-tech buyers",
				"Healthtech CFOs",
				"VP Marketing · vertical SaaS",
			];

	return (
		<div className="grid flex-1 place-items-center px-6 py-10">
			<div className="max-w-[460px] text-center">
				<div
					className={cn(
						"mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl transition-colors duration-500",
						isRecruiting
							? "bg-white/15 text-white ring-1 ring-white/25"
							: "bg-[var(--color-brand-tint)] text-[var(--color-brand)] ring-1 ring-[var(--color-brand)]/15",
					)}
				>
					<MagnifyingGlass size={26} weight="regular" />
				</div>
				<h2 className="mb-3 font-heading text-[36px] font-semibold leading-tight tracking-tight">
					{isRecruiting
						? "Find your next great hire"
						: "Find your next customer"}
				</h2>
				<p
					className={cn(
						"mx-auto mb-6 max-w-[380px] text-[15px] leading-snug",
						isRecruiting ? "text-white/80" : "text-[var(--color-brand)]/75",
					)}
				>
					Describe who you're looking for in plain English — Kiami builds the
					filters and runs the search for you.
				</p>
				<Link
					to="/new"
					className={cn(
						"inline-flex items-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors",
						isRecruiting
							? "bg-white text-[var(--color-brand)] hover:bg-white/90"
							: "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-2)]",
					)}
				>
					<Plus size={14} weight="bold" />
					New search
				</Link>
				<div className="mt-8 flex flex-wrap justify-center gap-2">
					{examples.map((t) => (
						<Badge
							key={t}
							variant="secondary"
							className={cn(
								"gap-1.5 border-0 py-1 text-[12px] font-medium",
								isRecruiting
									? "bg-white/15 text-white"
									: "bg-[var(--color-brand-tint)] text-[var(--color-brand)]",
							)}
						>
							<Sparkle
								size={12}
								weight="fill"
								className={
									isRecruiting ? "text-white" : "text-[var(--color-brand)]"
								}
							/>
							{t}
						</Badge>
					))}
				</div>
			</div>
		</div>
	);
}
