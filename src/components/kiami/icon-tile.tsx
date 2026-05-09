import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "brand" | "peach" | "coral" | "lavender" | "moss" | "muted";

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
	brand: {
		bg: "var(--color-brand-tint)",
		fg: "var(--color-brand)",
	},
	peach: {
		bg: "var(--color-peach)",
		fg: "var(--color-peach-icon)",
	},
	coral: {
		bg: "var(--color-coral)",
		fg: "var(--color-coral-icon)",
	},
	lavender: {
		bg: "var(--color-lavender)",
		fg: "var(--color-lavender-ink)",
	},
	moss: {
		bg: "var(--color-moss)",
		fg: "var(--color-moss-ink)",
	},
	muted: {
		bg: "var(--muted)",
		fg: "var(--muted-foreground)",
	},
};

export function IconTile({
	tone = "brand",
	size = "md",
	className,
	children,
}: {
	tone?: Tone;
	size?: "md" | "lg";
	className?: string;
	children: ReactNode;
}) {
	const dims = size === "lg" ? "h-11 w-11 rounded-xl" : "h-9 w-9 rounded-[10px]";
	const t = toneStyles[tone];
	return (
		<span
			className={cn("grid shrink-0 place-items-center", dims, className)}
			style={{ background: t.bg, color: t.fg }}
		>
			{children}
		</span>
	);
}
