import { useEffect, useState } from "react";

const DEFAULT = ["filters", "boolean", "lists", "queries"];

export function RotatingWord({
	words = DEFAULT,
	color = "var(--color-brand)",
}: {
	words?: string[];
	color?: string;
}) {
	const [i, setI] = useState(0);
	useEffect(() => {
		const t = setInterval(() => setI((v) => (v + 1) % words.length), 2200);
		return () => clearInterval(t);
	}, [words.length]);

	const widest = words.reduce((a, b) => (a.length > b.length ? a : b), "");

	return (
		<span className="relative inline-block overflow-hidden align-bottom leading-[1.05]">
			<span
				aria-hidden
				className="invisible inline-block whitespace-pre italic"
			>
				{widest}
			</span>
			<span
				key={i}
				className="absolute inset-0 flex items-center justify-center whitespace-pre italic"
				style={{
					color,
					animation: "kiami-rot-in 600ms cubic-bezier(0.7, 0, 0.2, 1) both",
				}}
			>
				{words[i]}
			</span>
		</span>
	);
}
