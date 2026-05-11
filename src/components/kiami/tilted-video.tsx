import { useEffect, useRef, useState } from "react";

const DEMO_VIDEO_URL = "/kiami-demo.mp4";

const MAX_TILT_DEG = 24;
const MAX_GLOW = 1; // 0..1, scales the glow strength

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
	const brand = "30,91,255"; // var(--color-brand) as RGB
	const halo =
		glow > 0
			? `, 0 0 0 1px rgba(${brand},${(0.18 * glow).toFixed(3)}), 0 30px 90px -10px rgba(${brand},${(0.55 * glow).toFixed(3)}), 0 60px 140px -20px rgba(${brand},${(0.35 * glow).toFixed(3)})`
			: "";

	return (
		<div className="px-8 pt-10 pb-20" style={{ perspective: 1600 }}>
			<div
				ref={wrapRef}
				className="mx-auto max-w-[1040px] overflow-hidden rounded-[18px] border"
				style={{
					transform: `rotateX(${tilt}deg)`,
					transformOrigin: "50% 100%",
					willChange: "transform, box-shadow",
					boxShadow: `${ambient}${halo}`,
					borderColor: `rgba(${brand},${(0.35 * glow).toFixed(3)})`,
					background: "#0B1220",
				}}
			>
				<div className="relative aspect-video">
					{/* Native browser controls — play/pause, scrub bar, volume,
					    fullscreen — all guaranteed to work regardless of the
					    parent's 3D transform. The custom overlay was eating
					    clicks; this trades that for the default chrome. */}
					<video
						className="absolute inset-0 h-full w-full object-cover"
						src={DEMO_VIDEO_URL}
						controls
						controlsList="nodownload"
						preload="metadata"
						playsInline
						loop
					/>
				</div>
			</div>
		</div>
	);
}
