import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Warning } from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FocusedHeader } from "@/components/kiami/focused-header";
import {
	loadBrief,
	saveResult,
	useRunSearch,
	type StoredSearchResult,
} from "@/hooks/use-search";

export const Route = createFileRoute("/new/thinking")({
	component: ThinkingPage,
});

const TRACE_LINES = [
	"Parsing brief — calling OpenAI for filter inference.",
	"Submitting BetterContact Lead Finder.",
	"Polling BetterContact for results.",
	"Falling back to Apollo if needed.",
	"Stripping PII and normalizing leads.",
];

function ThinkingPage() {
	const navigate = useNavigate();
	const runSearch = useRunSearch();
	const [error, setError] = useState<string | null>(null);
	const [step, setStep] = useState(0);
	const startedRef = useRef(false);

	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;

		const brief = loadBrief();
		if (!brief) {
			void navigate({ to: "/new" });
			return;
		}

		const interval = window.setInterval(() => {
			setStep((s) => Math.min(s + 1, TRACE_LINES.length - 1));
		}, 2_500);

		(async () => {
			try {
				const result = (await runSearch({
					flow: brief.flow,
					brief: brief.brief,
				})) as unknown as StoredSearchResult;
				saveResult({ ...result, finished_at: Date.now() });
				window.clearInterval(interval);
				void navigate({ to: "/results" });
			} catch (err) {
				window.clearInterval(interval);
				setError(err instanceof Error ? err.message : String(err));
			}
		})();

		return () => window.clearInterval(interval);
	}, [navigate, runSearch]);

	if (error) {
		return (
			<div className="min-h-screen bg-background">
				<FocusedHeader />
				<div className="grid place-items-center px-8 pt-16 pb-20">
					<div className="max-w-[520px] text-center">
						<div
							className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl"
							style={{
								background: "var(--destructive-foreground, var(--color-coral))",
								color: "var(--destructive, #B91C1C)",
							}}
						>
							<Warning size={22} weight="fill" />
						</div>
						<div className="font-heading text-[32px] font-semibold leading-tight tracking-tight">
							Something went wrong.
						</div>
						<p
							className="mx-auto mt-3 max-w-[420px] break-words text-[14px] text-muted-foreground"
							style={{ wordBreak: "break-word" }}
						>
							{error}
						</p>
						<div className="mt-7 flex justify-center gap-2">
							<Link
								to="/new"
								className={buttonVariants({ variant: "outline" })}
							>
								Start over
							</Link>
							<Button onClick={() => window.location.reload()}>Retry</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

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
						Inferring filters with OpenAI, then asking BetterContact and Apollo
						who they know. Usually 30–90 seconds.
					</p>
					<div
						className="mt-6 inline-flex items-center gap-1.5 rounded-full border bg-muted px-4 py-2 text-[13px]"
						style={{ color: "var(--color-ink-2)" }}
					>
						<ThinkingDot />
						<ThinkingDot delay={0.3} />
						<ThinkingDot delay={0.6} />
						<span className="ml-1.5">{TRACE_LINES[step]}</span>
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
				<Receipts step={step} />
			</div>
		</div>
	);
}

function Pulse() {
	return (
		<div className="relative mx-auto" style={{ width: 220, height: 220 }}>
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

function Receipts({ step }: { step: number }) {
	return (
		<div className="grid gap-2.5">
			{TRACE_LINES.map((txt, i) => (
				<div
					key={i}
					className="flex items-start gap-3 rounded-xl bg-muted px-3.5 py-3"
					style={{
						animation: `kiami-fade-up 600ms ease-out ${i * 0.15}s both`,
					}}
				>
					<span className="pt-0.5 font-mono-display text-[11px] text-muted-foreground">
						{`0:${String((i + 1) * 2).padStart(2, "0")}`}
					</span>
					<span
						className="flex-1 text-[13px]"
						style={{ color: "var(--color-ink-2)" }}
					>
						{txt}
					</span>
					{i < step ? (
						<Check size={14} weight="bold" color="#22A06B" />
					) : (
						<ThinkingDot />
					)}
				</div>
			))}
		</div>
	);
}
