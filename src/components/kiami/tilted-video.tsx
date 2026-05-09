import { useEffect, useRef, useState } from "react";
import { Play } from "@phosphor-icons/react";

const PLACEHOLDER_VIDEO_URL =
	"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

const MAX_TILT_DEG = 24;
const MAX_GLOW = 1; // 0..1, scales the glow strength

export function TiltedVideo() {
	const ref = useRef<HTMLVideoElement | null>(null);
	const wrapRef = useRef<HTMLDivElement | null>(null);
	const [playing, setPlaying] = useState(true);
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

	const togglePlay = () => {
		const v = ref.current;
		if (!v) return;
		if (v.paused) {
			v.play();
			setPlaying(true);
		} else {
			v.pause();
			setPlaying(false);
		}
	};

	const tilt = progress * MAX_TILT_DEG;
	const glow = progress * MAX_GLOW;
	// Two stacked shadows: the soft ambient drop, plus a brand-tinted glow
	// that lights up the rim when the element is far from the viewport
	// center and fades out as the user scrolls it into focus.
	const ambient =
		"0 40px 80px -30px rgba(11,18,32,0.35), 0 12px 24px -12px rgba(11,18,32,0.18)";
	const brand = "30,91,255"; // var(--color-brand) as RGB
	const halo = glow > 0
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
					transformStyle: "preserve-3d",
					willChange: "transform, box-shadow",
					boxShadow: `${ambient}${halo}`,
					borderColor: `rgba(${brand},${(0.35 * glow).toFixed(3)})`,
					background: "#0B1220",
				}}
			>
				{/* Browser chrome */}
				<div className="flex items-center gap-2 border-b border-white/5 bg-[#0F1726] px-4 py-3">
					<span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
					<span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
					<span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
					<span className="ml-3.5 font-mono-display text-[12px] text-white/45">
						kiami.ai/search
					</span>
					<span className="ml-auto flex items-center gap-1.5 text-[11px] text-white/45">
						<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF5F57]" />
						REC · live demo
					</span>
				</div>

				{/* Video area */}
				<div className="relative aspect-video">
					<video
						ref={ref}
						className="absolute inset-0 h-full w-full object-cover"
						src={PLACEHOLDER_VIDEO_URL}
						autoPlay
						loop
						muted
						playsInline
						poster=""
						onPlay={() => setPlaying(true)}
						onPause={() => setPlaying(false)}
					/>

					{/* Dim overlay */}
					<div
						className="pointer-events-none absolute inset-0"
						style={{
							background:
								"radial-gradient(circle at 30% 20%, rgba(27,35,51,0.35), rgba(11,18,32,0.65) 70%)",
						}}
					/>

					{/* Play / pause control */}
					<button
						type="button"
						onClick={togglePlay}
						aria-label={playing ? "Pause" : "Play"}
						className="absolute inset-0 grid place-items-center transition-opacity"
						style={{ opacity: playing ? 0 : 1 }}
					>
						<span
							className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white"
							style={{ boxShadow: "0 12px 32px rgba(30,91,255,0.45)" }}
						>
							<Play
								weight="fill"
								size={28}
								color="var(--color-brand)"
							/>
						</span>
					</button>

					{/* Bottom HUD */}
					<div className="pointer-events-none absolute inset-x-6 bottom-5 flex items-center justify-between font-mono-display text-[12px] text-white/55">
						<span>Watch how Kiami works</span>
						<span>00:08 / 01:48</span>
					</div>
				</div>
			</div>
		</div>
	);
}
