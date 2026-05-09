import { cn } from "@/lib/utils";
import type { Flow } from "./flow";

export function FlowTabs({
	value,
	onChange,
	className,
}: {
	value: Flow;
	onChange: (v: Flow) => void;
	className?: string;
}) {
	const opts: Array<[Flow, string]> = [
		["recruiting", "Recruiting"],
		["sales", "Sales GTM"],
	];
	return (
		<div
			className={cn(
				"inline-flex items-center rounded-full border bg-muted p-1",
				className,
			)}
		>
			{opts.map(([id, label]) => {
				const active = value === id;
				return (
					<button
						type="button"
						key={id}
						onClick={() => onChange(id)}
						className={cn(
							"rounded-full px-4 py-1.5 text-sm transition-colors",
							active
								? "bg-card text-foreground font-medium shadow-sm border border-border"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{label}
					</button>
				);
			})}
		</div>
	);
}
