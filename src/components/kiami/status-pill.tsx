import { cn } from "@/lib/utils";

export type Status = "running" | "paused" | "draft";

const dotColor: Record<Status, string> = {
	running: "#22A06B",
	paused: "#E6B23A",
	draft: "var(--muted-foreground)",
};

const labels: Record<Status, string> = {
	running: "Running",
	paused: "Paused",
	draft: "Draft",
};

export function StatusPill({
	status,
	className,
}: {
	status: Status;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium",
				className,
			)}
		>
			<span
				className="h-2 w-2 rounded-full"
				style={{
					background: dotColor[status],
					boxShadow:
						status === "running"
							? "0 0 0 3px rgba(34,160,107,0.18)"
							: undefined,
				}}
			/>
			{labels[status]}
		</span>
	);
}
