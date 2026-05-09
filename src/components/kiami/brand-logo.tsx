import { useState } from "react";

import { cn } from "@/lib/utils";

// Tries Clearbit's logo CDN first (rich square logos), then Google's s2
// favicon service as a fallback so we never show a blank.
export function BrandLogo({
	domain,
	name,
	size = 28,
	className,
}: {
	domain: string;
	name: string;
	size?: number;
	className?: string;
}) {
	const [stage, setStage] = useState<"primary" | "fallback" | "failed">(
		"primary",
	);

	if (stage === "failed") {
		return (
			<span
				aria-hidden
				className={cn(
					"grid place-items-center rounded-md text-[11px] font-semibold text-foreground/70",
					className,
				)}
				style={{
					width: size,
					height: size,
					background: "var(--color-brand-tint)",
				}}
			>
				{name.slice(0, 1)}
			</span>
		);
	}

	const src =
		stage === "primary"
			? `https://logo.clearbit.com/${domain}`
			: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

	return (
		<img
			src={src}
			alt={name}
			width={size}
			height={size}
			loading="lazy"
			className={cn("rounded-md object-contain", className)}
			onError={() =>
				setStage((s) => (s === "primary" ? "fallback" : "failed"))
			}
		/>
	);
}
