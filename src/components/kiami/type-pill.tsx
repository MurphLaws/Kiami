import { cn } from "@/lib/utils";
import type { Flow } from "./flow";

export function TypePill({
	flow,
	className,
}: {
	flow: Flow;
	className?: string;
}) {
	const isRec = flow === "recruiting";
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
				className,
			)}
			style={{
				background: isRec ? "var(--color-peach)" : "var(--color-coral)",
				color: isRec ? "var(--color-peach-ink)" : "var(--color-coral-ink)",
				borderColor: isRec
					? "rgba(255,122,77,0.25)"
					: "rgba(255,90,69,0.25)",
			}}
		>
			{isRec ? "Recruiting" : "Lead Finder"}
		</span>
	);
}
