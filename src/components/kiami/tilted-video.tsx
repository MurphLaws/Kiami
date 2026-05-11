import { useEffect, useRef, useState } from "react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
	defaultLayoutIcons,
	DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

const DEMO_VIDEO_URL = "/kiami-demo.mp4";

const MAX_TILT_DEG = 24;
const MAX_GLOW = 1;

export function TiltedVideo() {
	const wrapRef = useRef<HTMLDivElement | null>(null);
	const [progress, setProgress] = useState(MAX_GLOW);

	useEffect(() => {
		let raf: number | null = null;
		const compute = () => {
			raf = null;
			const el = wrapRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const vh = window.innerHeight || 1;
			// 0 when element center sits at viewport center (or above) → flat,
			// no glow. 1 when element is fully below the viewport → max tilt
			// + max glow. Both interpolate smoothly with scroll.
			const offCenter = rect.top + rect.height / 2 - vh / 2;
			const p = Math.max(0, Math.min(1, offCenter / vh));
			setProgress(p);
		};
		const onScroll = () => {
			if (raf !== null) return;
			raf = requestAnimationFrame(compute);
		};
		compute();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
			if (raf !== null) cancelAnimationFrame(raf);
		};
	}, []);

	const tilt = progress * MAX_TILT_DEG;
	const glow = progress * MAX_GLOW;
	const ambient =
		"0 40px 80px -30px rgba(11,18,32,0.35), 0 12px 24px -12px rgba(11,18,32,0.18)";
	const brand = "30,91,255";
	const halo =
		glow > 0
			? `, 0 0 0 1px rgba(${brand},${(0.18 * glow).toFixed(3)}), 0 30px 90px -10px rgba(${brand},${(0.55 * glow).toFixed(3)}), 0 60px 140px -20px rgba(${brand},${(0.35 * glow).toFixed(3)})`
			: "";

	// Only apply the rotation when meaningfully tilted; once the user has
	// scrolled the tile into view we drop the transform entirely so pointer
	// events through the Vidstack scrubber can never be perturbed by a 3D
	// rendering context.
	const transformStyle =
		tilt > 0.5 ? `rotateX(${tilt}deg)` : undefined;

	return (
		<div
			className="px-8 pt-10 pb-20"
			style={transformStyle ? { perspective: 1600 } : undefined}
		>
			<div
				ref={wrapRef}
				className="mx-auto max-w-[1040px] overflow-hidden rounded-[18px] border"
				style={{
					transform: transformStyle,
					transformOrigin: "50% 100%",
					willChange: "transform, box-shadow",
					boxShadow: `${ambient}${halo}`,
					borderColor: `rgba(${brand},${(0.35 * glow).toFixed(3)})`,
					background: "#0B1220",
				}}
			>
				<MediaPlayer
					src={DEMO_VIDEO_URL}
					viewType="video"
					streamType="on-demand"
					crossOrigin
					playsInline
					aspectRatio="16/9"
					className="block"
				>
					<MediaProvider />
					<DefaultVideoLayout icons={defaultLayoutIcons} />
				</MediaPlayer>
			</div>
		</div>
	);
}
