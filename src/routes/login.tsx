import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Spinner } from "@phosphor-icons/react";
import { KiamiMark } from "@/components/kiami/logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [pending, setPending] = useState<null | "google" | "microsoft" | "email">(
		null,
	);

	function go(via: "google" | "microsoft" | "email") {
		setPending(via);
		// Brief delay so the spinner registers as a real handoff —
		// makes the demo feel like a real OAuth round-trip.
		window.setTimeout(() => {
			void navigate({ to: "/dashboard" });
		}, 650);
	}

	function onEmailSubmit(e: React.FormEvent) {
		e.preventDefault();
		go("email");
	}

	return (
		<div className="relative min-h-screen overflow-hidden bg-muted">
			<MascotWatermark />
			<div className="relative mx-auto flex min-h-screen max-w-[440px] flex-col px-6 py-10">
				<Link to="/" className="inline-flex items-center gap-2">
					<KiamiMark size={28} />
					<span className="font-heading text-[18px] font-semibold tracking-tight text-foreground">
						Kiami
					</span>
				</Link>

				<div className="mt-16 mb-8">
					<span
						className="font-mono-display text-[11px] font-medium tracking-[0.18em] uppercase"
						style={{ color: "var(--color-brand)" }}
					>
						Sign in
					</span>
					<h1 className="mt-3 font-heading text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground">
						Welcome back.
					</h1>
					<p className="mt-2 text-[15px] text-muted-foreground">
						Continue to your Kiami workspace.
					</p>
				</div>

				<div className="grid gap-2.5">
					<OauthButton
						provider="google"
						onClick={() => go("google")}
						pending={pending === "google"}
						disabled={pending !== null && pending !== "google"}
					/>
					<OauthButton
						provider="microsoft"
						onClick={() => go("microsoft")}
						pending={pending === "microsoft"}
						disabled={pending !== null && pending !== "microsoft"}
					/>
				</div>

				<Divider />

				<form onSubmit={onEmailSubmit} className="grid gap-3">
					<Field
						label="Work email"
						type="email"
						value={email}
						onChange={setEmail}
						placeholder="you@company.com"
						autoFocus
					/>
					<Field
						label="Password"
						type="password"
						value={password}
						onChange={setPassword}
						placeholder="••••••••"
					/>
					<button
						type="submit"
						disabled={pending !== null}
						className={cn(
							"mt-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-[6px] px-5 text-[14px] font-medium transition-colors",
							"text-white shadow-sm",
							pending === "email"
								? "cursor-wait"
								: "hover:brightness-95",
							pending !== null && pending !== "email" && "opacity-60",
						)}
						style={{ background: "var(--color-brand)" }}
					>
						{pending === "email" ? (
							<>
								<Spinner size={14} className="animate-spin" />
								Signing in…
							</>
						) : (
							<>
								Sign in
								<ArrowRight size={13} weight="bold" />
							</>
						)}
					</button>
				</form>

				<p className="mt-8 text-[13px] text-muted-foreground">
					Don't have an account?{" "}
					<Link
						to="/login"
						className="font-medium underline underline-offset-2"
						style={{ color: "var(--color-brand)" }}
					>
						Start a 14-day trial
					</Link>
				</p>

				<div className="mt-auto pt-10">
					<p className="text-[11px] text-muted-foreground">
						By continuing you agree to Kiami's Terms and Privacy Policy.
					</p>
				</div>
			</div>
		</div>
	);
}

function OauthButton({
	provider,
	onClick,
	pending,
	disabled,
}: {
	provider: "google" | "microsoft";
	onClick: () => void;
	pending: boolean;
	disabled: boolean;
}) {
	const label =
		provider === "google" ? "Continue with Google" : "Continue with Microsoft";
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || pending}
			className={cn(
				"group inline-flex h-11 items-center justify-center gap-2.5 rounded-[6px] border bg-card px-5 text-[14px] font-medium text-foreground transition-all",
				"hover:border-[var(--color-brand)] hover:shadow-sm",
				(disabled || pending) && "opacity-60",
			)}
		>
			{pending ? (
				<Spinner size={16} className="animate-spin" />
			) : provider === "google" ? (
				<GoogleGlyph />
			) : (
				<MicrosoftGlyph />
			)}
			<span>{pending ? "Redirecting…" : label}</span>
		</button>
	);
}

function GoogleGlyph() {
	return (
		<svg width={16} height={16} viewBox="0 0 24 24" aria-hidden>
			<path
				fill="#4285F4"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
			/>
			<path
				fill="#34A853"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
			/>
			<path
				fill="#FBBC05"
				d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"
			/>
			<path
				fill="#EA4335"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
			/>
		</svg>
	);
}

function MicrosoftGlyph() {
	return (
		<svg width={16} height={16} viewBox="0 0 24 24" aria-hidden>
			<rect x={1} y={1} width={10} height={10} fill="#F25022" />
			<rect x={13} y={1} width={10} height={10} fill="#7FBA00" />
			<rect x={1} y={13} width={10} height={10} fill="#00A4EF" />
			<rect x={13} y={13} width={10} height={10} fill="#FFB900" />
		</svg>
	);
}

function Divider() {
	return (
		<div className="my-6 flex items-center gap-3">
			<span className="h-px flex-1 bg-border" />
			<span className="font-mono-display text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
				or
			</span>
			<span className="h-px flex-1 bg-border" />
		</div>
	);
}

function Field({
	label,
	type,
	value,
	onChange,
	placeholder,
	autoFocus,
}: {
	label: string;
	type: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	autoFocus?: boolean;
}) {
	return (
		<label className="grid gap-1.5">
			<span className="font-mono-display text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
				{label}
			</span>
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				autoFocus={autoFocus}
				autoComplete={type === "password" ? "current-password" : "email"}
				className="h-11 rounded-[6px] border bg-card px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:border-[var(--color-brand)] focus:outline-none"
			/>
		</label>
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
