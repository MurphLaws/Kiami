import { cn } from "@/lib/utils";

export function KiamiLogo({
	size = 22,
	className,
}: {
	size?: number;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-2 font-heading font-semibold tracking-tight",
				className,
			)}
			style={{ fontSize: size }}
		>
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
				<rect
					x="2"
					y="2"
					width="20"
					height="20"
					rx="6"
					fill="var(--color-brand)"
				/>
				<path
					d="M8 7v10M8 12l6-5M8 12l6 5"
					stroke="#fff"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
			<span>Kiami</span>
		</span>
	);
}
