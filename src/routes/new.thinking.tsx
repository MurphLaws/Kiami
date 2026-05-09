import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { FocusedHeader } from "@/components/kiami/focused-header";

export const Route = createFileRoute("/new/thinking")({
	component: ThinkingPage,
});

function ThinkingPage() {
	return (
		<div className="min-h-screen bg-background">
			<FocusedHeader />
			<div className="grid place-items-center px-8 pt-16 pb-20">
				<div className="max-w-[520px] text-center">
					<Pulse />
					<div className="mt-7 font-heading text-[40px] font-semibold leading-tight tracking-tight">
						Kiami is on it.
					</div>
					<p className="mt-3 text-[17px] text-muted-foreground">
						Searching public profiles, ranking by fit, and cross-checking your
						must-haves. Usually 30–90 seconds.
					</p>
					<div
						className="mt-6 inline-flex items-center gap-1.5 rounded-full border bg-muted px-4 py-2 text-[13px]"
						style={{ color: "var(--color-ink-2)" }}
					>
						<ThinkingDot />
						<ThinkingDot delay={0.3} />
						<ThinkingDot delay={0.6} />
						<span className="ml-1.5">Ranking by trajectory + recency</span>
					</div>
					<div className="mt-7 flex justify-center gap-2">
						<Link
							to="/dashboard"
							className={buttonVariants({ variant: "outline" })}
						>
							Run in background
						</Link>
						<Link
							to="/dashboard"
							className={buttonVariants({ variant: "ghost" })}
						>
							Cancel
						</Link>
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-[760px] px-8 pb-20">
				<div className="mb-2 text-[12px] font-semibold tracking-[0.10em] text-muted-foreground uppercase">
					Live trace
				</div>
				<div className="mb-5 font-heading text-[22px] font-semibold tracking-tight">
					What Kiami is doing right now
				</div>
				<Receipts />
			</div>
		</div>
	);
}

function Pulse() {
	return (
		<div
			className="relative mx-auto"
			style={{ width: 220, height: 220 }}
		>
			{[0, 0.6, 1.2].map((d) => (
				<span
					key={d}
					className="absolute inset-0 rounded-full opacity-0"
					style={{
						border: "1px solid var(--color-brand)",
						animation: `kiami-ring 2.4s ease-out ${d}s infinite`,
					}}
				/>
			))}
			<div
				className="absolute rounded-full"
				style={{
					inset: 36,
					background:
						"radial-gradient(closest-side, var(--color-brand-tint), transparent 70%)",
					animation: "kiami-glow 2.6s ease-in-out infinite",
				}}
			/>
			<div
				className="absolute h-4 w-4 rounded-full"
				style={{
					inset: "50%",
					background: "var(--color-brand)",
					transform: "translate(-50%, -50%)",
				}}
			/>
		</div>
	);
}

function ThinkingDot({ delay = 0 }: { delay?: number }) {
	return (
		<span
			className="inline-block h-1.5 w-1.5 rounded-full"
			style={{
				background: "var(--color-brand)",
				animation: `kiami-pulse 1.2s ease-in-out ${delay}s infinite`,
			}}
		/>
	);
}

function Receipts() {
	const lines = [
		{ t: "0:01", txt: "Parsing brief — extracted 7 criteria." },
		{ t: "0:03", txt: "Searching public profiles · 4 sources." },
		{ t: "0:07", txt: "Ranking by trajectory + recency." },
		{ t: "0:09", txt: "Filtering by must-haves (Go/Rust · Series-B+)." },
		{ t: "0:12", txt: "Cross-checking experience graph." },
	];
	return (
		<div className="grid gap-2.5">
			{lines.map((l, i) => (
				<div
					key={i}
					className="flex items-start gap-3 rounded-xl bg-muted px-3.5 py-3"
					style={{
						animation: `kiami-fade-up 600ms ease-out ${i * 0.15}s both`,
					}}
				>
					<span className="pt-0.5 font-mono-display text-[11px] text-muted-foreground">
						{l.t}
					</span>
					<span
						className="flex-1 text-[13px]"
						style={{ color: "var(--color-ink-2)" }}
					>
						{l.txt}
					</span>
					{i < lines.length - 1 ? (
						<Check size={14} weight="bold" color="#22A06B" />
					) : (
						<ThinkingDot />
					)}
				</div>
			))}
		</div>
	);
}
