import { useEffect, useState } from "react";

// Three words, all 7 letters, all grammatically clean after
// "Stop building ___". Equal length keeps the placeholder width
// stable so the line never looks lopsided.
const DEFAULT = ["filters", "queries", "funnels"];

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
		<span className="relative inline-block align-bottom leading-[1.05]">
			{/* Placeholder reserves width — italic overhang is absorbed by a small
			    right-padding so descenders/ascenders don't visually clip. */}
			<span
				aria-hidden
				className="invisible inline-block whitespace-pre italic"
				style={{ paddingRight: "0.15em" }}
			>
				{widest}
			</span>
			<span
				key={i}
				className="absolute inset-0 flex items-center justify-start whitespace-pre italic"
				style={{
					color,
					paddingRight: "0.15em",
					animation: "kiami-rot-in 600ms cubic-bezier(0.7, 0, 0.2, 1) both",
				}}
			>
				{words[i]}
			</span>
		</span>
	);
}
