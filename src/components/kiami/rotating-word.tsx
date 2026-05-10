import { useEffect, useState } from "react";

// Each word gets its own animation slot in lockstep with the index, so
// the rotator never feels like a canned single effect. Order picked
// so two adjacent words don't share a movement direction.
const DEFAULT = ["filters", "shortlists", "spreadsheets", "queries"];

const VARIANTS = [
	"fade", // word 0
	"slide", // word 1
	"dither", // word 2
	"glitch", // word 3
] as const;
type Variant = (typeof VARIANTS)[number];

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
	const variant = VARIANTS[i % VARIANTS.length];

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
				className="absolute inset-0 flex items-center justify-start overflow-hidden whitespace-pre italic"
				style={{ color, paddingRight: "0.15em" }}
			>
				<AnimatedWord word={words[i]} variant={variant} />
			</span>
		</span>
	);
}

function AnimatedWord({ word, variant }: { word: string; variant: Variant }) {
	if (variant === "fade") {
		return (
			<span
				className="inline-block whitespace-pre"
				style={{
					animation: "kiami-rot-in 600ms cubic-bezier(0.7, 0, 0.2, 1) both",
				}}
			>
				{word}
			</span>
		);
	}
	if (variant === "slide") {
		return (
			<span
				className="inline-block whitespace-pre"
				style={{
					animation: "kiami-rot-slide 540ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
				}}
			>
				{word}
			</span>
		);
	}
	if (variant === "dither") {
		return (
			<span
				className="inline-block whitespace-pre"
				style={{
					animation: "kiami-rot-dither 780ms steps(8, end) both",
				}}
			>
				{word}
			</span>
		);
	}
	// glitch — per-character RGB split that converges.
	return (
		<span className="inline-block whitespace-pre">
			{word.split("").map((ch, idx) => (
				<span
					key={`${ch}-${idx}`}
					className="inline-block"
					style={{
						animation: `kiami-rot-glitch 620ms cubic-bezier(0.2, 0.8, 0.2, 1) ${idx * 35}ms both`,
					}}
				>
					{ch === " " ? " " : ch}
				</span>
			))}
		</span>
	);
}
