import { cn } from "@/lib/utils";

/*
 * Kiami mascot — a tilted vintage handset with a `><` chevron face above
 * its body. Drawn as three paths (two chevrons + handset body), rotated
 * −7°. Ink default; pass `color` to recolor the strokes.
 *
 * Use <KiamiMark /> for the mark alone; <KiamiLogo /> for the lockup
 * (mark + lowercase wordmark "kiami").
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
	const stroke = color ?? "var(--color-brand)";
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
				<path d="M30 28 L22 36 L30 44" />
				<path d="M58 28 L66 36 L58 44" />
				<path d="M14 56 Q14 50 20 50 L36 50 Q42 50 44 58 L48 72 Q50 80 58 80 L70 80 Q78 80 80 72 L82 60 Q84 52 78 50 L62 50" />
			</g>
		</svg>
	);
}

export function KiamiLogo({
	size = 22,
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
			className={cn(
				"inline-flex items-center gap-2 font-heading font-semibold tracking-tight",
				className,
			)}
			style={{ fontSize: size }}
		>
			<KiamiMark size={size + 4} color={color} />
			{showWordmark && <span>Kiami</span>}
		</span>
	);
}
