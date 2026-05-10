import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone } from "@phosphor-icons/react";
import { NavBar } from "./nav-bar";
import { KiamiLogo, KiamiMark } from "./logo";

/*
 * Landing — editorial-tech, hairlines over cards, mascot does the
 * personality lift. No marquees, no rotating words, no testimonials,
 * no fake-customer logo wall. One headline, one feature strip, one
 * screenshot section, one footer.
 */

export function LandingPage() {
	return (
		<div className="min-h-screen bg-paper text-ink">
			<NavBar />
			<Hero />
			<FeatureStrip />
			<ScreenshotSection />
			<Footer />
		</div>
	);
}

function Hero() {
	return (
		<section className="px-8 pt-20 pb-24">
			<div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-16 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
				<div>
					<span className="eyebrow">Agentic recruiting · lead finding</span>
					<h1
						className="mt-4 text-ink"
						style={{
							fontSize: "var(--type-display-xl)",
							fontWeight: 800,
							letterSpacing: "-0.04em",
							lineHeight: 1.02,
						}}
					>
						Stop building boolean strings. Start finding people.
					</h1>
					<p className="mt-6 max-w-[480px] text-[16px] leading-snug text-slate">
						kiami turns a one-line brief into a shortlist of contacts ready to
						call. No filter toggling, no tab juggling — just the people you
						want, with the context to open the conversation.
					</p>
					<div className="mt-8 flex flex-wrap items-center gap-3">
						<Link
							to="/dashboard"
							className="inline-flex items-center gap-1.5 rounded-[4px] bg-cobalt px-5 py-2.5 text-[14px] font-medium text-paper transition-colors hover:bg-deep"
						>
							Get started
							<ArrowRight size={13} weight="bold" />
						</Link>
						<a
							href="#how"
							className="inline-flex items-center gap-1.5 rounded-[4px] border border-ink px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-mist"
						>
							<Phone size={13} weight="bold" />
							See it in action
						</a>
					</div>
					<div className="mt-4 font-mono-display text-[11px] tracking-[0.18em] text-slate uppercase">
						14-day trial · No credit card
					</div>
				</div>
				<div className="grid place-items-center md:place-items-end">
					<MascotSpotlight />
				</div>
			</div>
		</section>
	);
}

function MascotSpotlight() {
	return (
		<div
			className="grid place-items-center"
			style={{ width: "min(420px, 100%)", aspectRatio: "1 / 1" }}
		>
			<div style={{ color: "var(--cobalt)" }}>
				<KiamiMark size={360} />
			</div>
		</div>
	);
}

function FeatureStrip() {
	const items = [
		{
			eyebrow: "01 · Brief",
			title: "Type the search in plain English.",
			body: "Paste a JD or describe the ICP. kiami picks the filters so you don't have to.",
		},
		{
			eyebrow: "02 · Sweep",
			title: "Strict + lax pulled in parallel.",
			body: "Two queries against BetterContact and Apollo. Bigger pool, tighter labeling.",
		},
		{
			eyebrow: "03 · Call",
			title: "Schedule outreach in one click.",
			body: "Per-contact scheduling, suggested openers, and an audit trail of every call.",
		},
	];
	return (
		<section
			id="how"
			className="border-y border-hairline px-8 py-16"
		>
			<div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 md:grid-cols-3">
				{items.map((it) => (
					<div key={it.eyebrow} className="border-t border-hairline pt-5">
						<span className="eyebrow">{it.eyebrow}</span>
						<h3
							className="mt-3 text-ink"
							style={{
								fontSize: "var(--type-h3)",
								fontWeight: 700,
								letterSpacing: "-0.02em",
								lineHeight: 1.25,
							}}
						>
							{it.title}
						</h3>
						<p className="mt-2 text-[14px] leading-snug text-slate">
							{it.body}
						</p>
					</div>
				))}
			</div>
		</section>
	);
}

function ScreenshotSection() {
	return (
		<section id="why" className="px-8 py-20">
			<div className="mx-auto max-w-[1200px]">
				<span className="eyebrow">The product</span>
				<h2
					className="mt-3 max-w-[680px] text-ink"
					style={{
						fontSize: "var(--type-h1)",
						fontWeight: 700,
						letterSpacing: "-0.025em",
						lineHeight: 1.15,
					}}
				>
					A contacts list that thinks before you call.
				</h2>
				<p className="mt-3 max-w-[560px] text-[15px] text-slate">
					Every row carries a brief, a suggested opener, and a one-click
					Schedule call action wired to your dialer. No CSV exports, no copy-
					paste between tabs.
				</p>
				<div className="mt-10 overflow-hidden rounded-[14px] border border-hairline bg-paper">
					<ScreenshotPlaceholder />
				</div>
			</div>
		</section>
	);
}

function ScreenshotPlaceholder() {
	const rows = [
		{ name: "Léa Marín", title: "VP People · Pennylane", tag: "hot" },
		{ name: "Tomás Yamazaki", title: "Head HR · Alma", tag: "warm" },
		{ name: "Rita Okafor", title: "Chief People Officer · Beam", tag: "hot" },
		{ name: "Ana Silva", title: "Recruiting Lead · Trafilea", tag: "warm" },
		{ name: "Jordan Mata", title: "Director Talent · Northwind", tag: "cold" },
	];
	return (
		<div className="grid">
			<div className="flex items-center gap-3 border-b border-hairline px-5 py-3">
				<span className="eyebrow">Contacts</span>
				<span className="font-mono-display tnum text-[11px] text-slate">
					05 results
				</span>
			</div>
			{rows.map((r, i) => (
				<div
					key={i}
					className={
						"grid grid-cols-[28px_minmax(0,1fr)_120px_140px] items-center gap-4 px-5 py-3 " +
						(i < rows.length - 1 ? "border-b border-hairline" : "")
					}
				>
					<div className="grid h-7 w-7 place-items-center rounded-full bg-mist text-[10px] font-semibold text-cobalt">
						{r.name
							.split(" ")
							.map((s) => s[0])
							.slice(0, 2)
							.join("")}
					</div>
					<div>
						<div className="text-[13px] font-medium text-ink">{r.name}</div>
						<div className="text-[11px] text-slate">{r.title}</div>
					</div>
					<div className="flex items-center gap-2 text-[12px] text-slate">
						<span
							className="inline-block h-1.5 w-1.5 rounded-full"
							style={{
								background:
									r.tag === "hot"
										? "var(--cobalt)"
										: r.tag === "warm"
											? "var(--sky)"
											: "var(--hairline)",
							}}
						/>
						<span className="capitalize">{r.tag}</span>
					</div>
					<div>
						<span className="inline-flex items-center gap-1 rounded-[4px] border border-cobalt px-2.5 py-1 text-[11px] font-medium text-cobalt">
							<Phone size={10} weight="bold" />
							Schedule call
						</span>
					</div>
				</div>
			))}
		</div>
	);
}

function Footer() {
	return (
		<footer className="border-t border-hairline px-8 py-8">
			<div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 text-[12px] text-slate">
				<KiamiLogo size={18} />
				<span className="font-mono-display tnum">© 2026 kiami</span>
				<nav className="flex items-center gap-5">
					<a href="#" className="transition-colors hover:text-ink">
						Privacy
					</a>
					<a href="#" className="transition-colors hover:text-ink">
						Terms
					</a>
					<a href="#" className="transition-colors hover:text-ink">
						Status
					</a>
				</nav>
			</div>
		</footer>
	);
}
