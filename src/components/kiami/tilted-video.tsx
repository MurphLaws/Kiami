import { useEffect, useRef, useState } from "react";
import {
	Play,
	Pause,
	SpeakerHigh,
	SpeakerSlash,
} from "@phosphor-icons/react";

const DEMO_VIDEO_URL = "/kiami-demo.mp4";

const MAX_TILT_DEG = 24;
const MAX_GLOW = 1; // 0..1, scales the glow strength

function formatTime(s: number) {
	if (!isFinite(s) || s < 0) return "0:00";
	const m = Math.floor(s / 60);
	const sec = Math.floor(s % 60);
	return `${m}:${String(sec).padStart(2, "0")}`;
}

export function TiltedVideo() {
	const ref = useRef<HTMLVideoElement | null>(null);
	const wrapRef = useRef<HTMLDivElement | null>(null);
	const [playing, setPlaying] = useState(false);
	const [muted, setMuted] = useState(false);
	const [current, setCurrent] = useState(0);
	const [duration, setDuration] = useState(0);
	const [hovering, setHovering] = useState(false);
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
			void v.play();
		} else {
			v.pause();
		}
	};

	const toggleMute = () => {
		const v = ref.current;
		if (!v) return;
		v.muted = !v.muted;
		setMuted(v.muted);
	};

	const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		const v = ref.current;
		if (!v) return;
		const t = Number(e.target.value);
		v.currentTime = t;
		setCurrent(t);
	};

	const tilt = progress * MAX_TILT_DEG;
	const glow = progress * MAX_GLOW;
	// The play button fades in as the user scrolls toward the video. When
	// the tile is below the viewport center, scrollProgress = 1 and the
	// button is fully visible; once the tile is centered (or above) it
	// fades to 0 — at that point the user is already looking at the video.
	const scrollProgress = 1 - progress;
	const ambient =
		"0 40px 80px -30px rgba(11,18,32,0.35), 0 12px 24px -12px rgba(11,18,32,0.18)";
	const brand = "30,91,255"; // var(--color-brand) as RGB
	const halo =
		glow > 0
			? `, 0 0 0 1px rgba(${brand},${(0.18 * glow).toFixed(3)}), 0 30px 90px -10px rgba(${brand},${(0.55 * glow).toFixed(3)}), 0 60px 140px -20px rgba(${brand},${(0.35 * glow).toFixed(3)})`
			: "";

	const seekPct = duration > 0 ? (current / duration) * 100 : 0;
	// Show controls when paused, or while the user is hovering during playback.
	const controlsVisible = !playing || hovering;

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
				onMouseEnter={() => setHovering(true)}
				onMouseLeave={() => setHovering(false)}
			>
				<div className="relative aspect-video">
					<video
						ref={ref}
						className="absolute inset-0 h-full w-full cursor-pointer object-cover"
						src={DEMO_VIDEO_URL}
						loop
						playsInline
						poster=""
						onClick={togglePlay}
						onPlay={() => setPlaying(true)}
						onPause={() => setPlaying(false)}
						onTimeUpdate={(e) =>
							setCurrent((e.target as HTMLVideoElement).currentTime)
						}
						onLoadedMetadata={(e) => {
							const v = e.target as HTMLVideoElement;
							setDuration(v.duration);
							setMuted(v.muted);
						}}
						onVolumeChange={(e) =>
							setMuted((e.target as HTMLVideoElement).muted)
						}
					/>

					{/* Dim overlay — only while the video is paused so the play
					    button reads clearly; fades out once playback starts. */}
					<div
						className="pointer-events-none absolute inset-0 transition-opacity duration-300"
						style={{
							opacity: playing ? 0 : 1,
							background:
								"radial-gradient(circle at 30% 20%, rgba(27,35,51,0.35), rgba(11,18,32,0.65) 70%)",
						}}
					/>

					{/* Big center play button — only shown while paused AND while
					    the user has scrolled the tile close to viewport center. */}
					<button
						type="button"
						onClick={togglePlay}
						aria-label={playing ? "Pause" : "Play"}
						className="absolute inset-0 grid place-items-center transition-opacity duration-300"
						style={{
							opacity: playing ? 0 : scrollProgress,
							pointerEvents: playing ? "none" : "auto",
						}}
					>
						<span
							className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white"
							style={{ boxShadow: "0 12px 32px rgba(30,91,255,0.45)" }}
						>
							<Play weight="fill" size={28} color="var(--color-brand)" />
						</span>
					</button>

					{/* Control bar — play/pause, scrubber, time, mute. Sits on a
					    gradient so it stays legible over light frames. Visible
					    when paused or on hover. */}
					<div
						className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 px-4 pt-10 pb-3 transition-opacity duration-200"
						style={{
							opacity: controlsVisible ? 1 : 0,
							background:
								"linear-gradient(to top, rgba(11,18,32,0.72), rgba(11,18,32,0))",
						}}
					>
						{/* Scrubber */}
						<div className="pointer-events-auto relative h-3 w-full">
							<div className="absolute top-1/2 left-0 right-0 h-[3px] -translate-y-1/2 rounded-full bg-white/25" />
							<div
								className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full"
								style={{
									width: `${seekPct}%`,
									background: "var(--color-brand)",
								}}
							/>
							<input
								type="range"
								min={0}
								max={duration || 0}
								step={0.05}
								value={current}
								onChange={onSeek}
								aria-label="Seek"
								className="kiami-video-scrub absolute inset-0 w-full cursor-pointer appearance-none bg-transparent"
							/>
						</div>

						<div className="flex items-center gap-3 text-white">
							<button
								type="button"
								onClick={togglePlay}
								aria-label={playing ? "Pause" : "Play"}
								className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full text-white transition-colors hover:bg-white/15"
							>
								{playing ? (
									<Pause weight="fill" size={16} />
								) : (
									<Play weight="fill" size={16} />
								)}
							</button>

							<button
								type="button"
								onClick={toggleMute}
								aria-label={muted ? "Unmute" : "Mute"}
								className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full text-white transition-colors hover:bg-white/15"
							>
								{muted ? (
									<SpeakerSlash weight="regular" size={16} />
								) : (
									<SpeakerHigh weight="regular" size={16} />
								)}
							</button>

							<div className="font-mono-display tnum ml-auto text-[12px] text-white/85">
								{formatTime(current)} / {formatTime(duration)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
