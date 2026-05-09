import { useEffect, useRef, useState } from "react";
import { Play } from "@phosphor-icons/react";

const PLACEHOLDER_VIDEO_URL =
	"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

const MAX_TILT_DEG = 14;

export function TiltedVideo() {
	const ref = useRef<HTMLVideoElement | null>(null);
	const wrapRef = useRef<HTMLDivElement | null>(null);
	const [playing, setPlaying] = useState(true);
	const [tilt, setTilt] = useState(MAX_TILT_DEG);

	useEffect(() => {
		let raf: number | null = null;
		const compute = () => {
			raf = null;
			const el = wrapRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const vh = window.innerHeight || 1;
			// 0 when element center sits at viewport center (or above) → flat.
			// 1 when element is fully below the viewport → max tilt.
			const offCenter = rect.top + rect.height / 2 - vh / 2;
			const progress = Math.max(0, Math.min(1, offCenter / vh));
			setTilt(progress * MAX_TILT_DEG);
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

	return (
		<div className="px-8 pt-10 pb-20" style={{ perspective: 1600 }}>
			<div
				ref={wrapRef}
				className="mx-auto max-w-[1040px] overflow-hidden rounded-[18px] border border-white/5"
				style={{
					transform: `rotateX(${tilt}deg)`,
					transformOrigin: "50% 100%",
					transformStyle: "preserve-3d",
					willChange: "transform",
					boxShadow:
						"0 40px 80px -30px rgba(11,18,32,0.35), 0 12px 24px -12px rgba(11,18,32,0.18)",
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
