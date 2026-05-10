import { cn } from "@/lib/utils";

/*
 * Kiami mascot — a tilted vintage handset with a `><` chevron face above
 * its body. The negative space below reads as a smile. Drawn as three
 * paths (two chevrons + one handset body), rotated −7° per the brand
 * brief. Only currentColor is used so the mark inherits whichever
 * surface tone it sits on.
 *
 * Use <KiamiMark /> for the mark alone; <KiamiLogo /> for the lockup
 * (mark + lowercase wordmark "kiami"). All existing call sites import
 * KiamiLogo so the upgrade is transparent.
 */

export function KiamiMark({
	size = 28,
	color,
	className,
}: {
	size?: number;
	color?: string;
	className?: string;
}) {
	const stroke = color ?? "var(--cobalt)";
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			fill="none"
			aria-hidden
			className={className}
		>
			<g
				transform="rotate(-7 50 50)"
				stroke={stroke}
				strokeWidth="6"
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			>
				{/* Left chevron eye `<` */}
				<path d="M30 28 L22 36 L30 44" />
				{/* Right chevron eye `>` */}
				<path d="M58 28 L66 36 L58 44" />
				{/* Handset body — receiver curve. The interior arc reads as a
				    smile because the stroke caps are round. */}
				<path d="M14 56 Q14 50 20 50 L36 50 Q42 50 44 58 L48 72 Q50 80 58 80 L70 80 Q78 80 80 72 L82 60 Q84 52 78 50 L62 50" />
			</g>
		</svg>
	);
}

export function KiamiLogo({
	size = 28,
	className,
	showWordmark = true,
	color,
}: {
	size?: number;
	className?: string;
	showWordmark?: boolean;
	color?: string;
}) {
	return (
		<span
			className={cn("inline-flex items-center gap-2.5", className)}
			style={{ color: color ?? "var(--ink)" }}
		>
			<KiamiMark size={size} color={color ?? "var(--cobalt)"} />
			{showWordmark && (
				<span
					style={{
						fontFamily: "'Hanken Grotesk Variable', system-ui, sans-serif",
						fontWeight: 800,
						letterSpacing: "-0.04em",
						fontSize: size * 1.08,
						lineHeight: 1,
					}}
				>
					kiami
				</span>
			)}
		</span>
	);
}
