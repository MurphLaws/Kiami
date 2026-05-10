import { cn } from "@/lib/utils";

/*
 * Kiami mascot. The art lives at /public/kiami-mascot.png — a tilted
 * vintage handset with a `><` chevron face. It's always rendered
 * against a white surface (the artwork bakes in the cobalt blue and
 * relies on white negative space below the body to read as a smile,
 * so any tinted background breaks the read). When a caller drops the
 * mark on a non-white surface, KiamiMark wraps it in a white plate.
 *
 * Use <KiamiMark /> for the mark alone; <KiamiLogo /> for the lockup
 * (mark + wordmark "Kiami").
 */

const MASCOT_INTRINSIC = { w: 195, h: 156 } as const;

export function KiamiMark({
	size = 28,
	className,
	plate = true,
	platePadding = 0.18,
}: {
	size?: number;
	className?: string;
	/** Wrap in a white square plate. Default true. Set false if the
	 *  parent already guarantees a white surface. */
	plate?: boolean;
	/** Padding inside the plate, expressed as a fraction of `size`. */
	platePadding?: number;
}) {
	const ratio = MASCOT_INTRINSIC.w / MASCOT_INTRINSIC.h;
	// We size the mark by its longer side; the box stays square so the
	// plate reads as a logo block at small sizes.
	const innerH = Math.round(size * (1 - platePadding * 2));
	const innerW = Math.round(innerH * ratio);
	if (!plate) {
		return (
			<img
				src="/kiami-mascot.png"
				alt=""
				aria-hidden
				width={Math.round(size * ratio)}
				height={size}
				className={className}
				draggable={false}
				style={{ display: "block" }}
			/>
		);
	}
	return (
		<span
			className={cn(
				"inline-grid place-items-center bg-white",
				className,
			)}
			style={{
				width: size,
				height: size,
				borderRadius: Math.max(4, Math.round(size * 0.18)),
			}}
		>
			<img
				src="/kiami-mascot.png"
				alt=""
				aria-hidden
				width={innerW}
				height={innerH}
				draggable={false}
				style={{ display: "block" }}
			/>
		</span>
	);
}

export function KiamiLogo({
	size = 22,
	className,
	showWordmark = true,
}: {
	size?: number;
	className?: string;
	showWordmark?: boolean;
}) {
	// Pick a plate size that visually balances the wordmark cap height.
	const plateSize = Math.round(size * 1.45);
	return (
		<span
			className={cn(
				"inline-flex items-center gap-2 font-heading font-semibold tracking-tight",
				className,
			)}
			style={{ fontSize: size }}
		>
			<KiamiMark size={plateSize} platePadding={0.14} />
			{showWordmark && <span>Kiami</span>}
		</span>
	);
}
