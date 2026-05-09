import { cn } from "@/lib/utils";

export function KiamiLogo({
	size = 22,
	className,
	showWordmark = true,
}: {
	size?: number;
	className?: string;
	showWordmark?: boolean;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-2 font-heading font-semibold tracking-tight",
				className,
			)}
			style={{ fontSize: size }}
		>
			<svg
				width={size}
				height={size}
				viewBox="0 0 32 32"
				fill="none"
				aria-hidden
			>
				<rect
					x="0"
					y="0"
					width="32"
					height="32"
					rx="8"
					fill="var(--color-brand)"
				/>
				<path
					d="M11 8v16M11 16l9-8M11 16l9 8"
					stroke="#fff"
					strokeWidth="2.6"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
			{showWordmark && <span>Kiami</span>}
		</span>
	);
}
