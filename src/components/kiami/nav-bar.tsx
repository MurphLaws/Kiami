import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { KiamiLogo } from "./logo";

export function NavBar() {
	const [scrolled, setScrolled] = useState(false);
	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 4);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);
	return (
		<header
			className={
				"sticky top-0 z-30 h-16 transition-colors duration-150 " +
				(scrolled
					? "border-b border-hairline bg-paper/95 backdrop-blur-md"
					: "border-b border-transparent bg-paper")
			}
		>
			<div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-8">
				<Link to="/" aria-label="kiami home">
					<KiamiLogo size={22} />
				</Link>
				<nav className="flex items-center gap-7 text-[13px]">
					<a
						href="#how"
						className="text-slate transition-colors hover:text-ink"
					>
						How it works
					</a>
					<a
						href="#why"
						className="text-slate transition-colors hover:text-ink"
					>
						Why kiami
					</a>
					<Link
						to="/dashboard"
						className="ml-3 inline-flex items-center gap-1.5 rounded-[4px] bg-cobalt px-3.5 py-1.5 font-medium text-paper transition-colors hover:bg-deep"
					>
						Get started
					</Link>
				</nav>
			</div>
		</header>
	);
}
