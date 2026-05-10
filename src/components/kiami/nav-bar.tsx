import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { KiamiLogo } from "./logo";

export function NavBar() {
	return (
		<header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur-md">
			<div className="mx-auto flex max-w-[1200px] items-center justify-between px-8 py-3.5">
				<div className="flex items-center gap-10">
					<Link to="/">
						<KiamiLogo size={20} />
					</Link>
					<nav className="hidden items-center gap-7 text-sm md:flex">
						{["Solutions", "Platform", "Pricing", "Resources"].map((l) => (
							<a
								key={l}
								href="#"
								className="text-muted-foreground transition-colors hover:text-foreground"
							>
								{l}
							</a>
						))}
					</nav>
				</div>
				<div className="flex items-center gap-2">
					<Link
						to="/login"
						className={buttonVariants({ variant: "ghost" })}
					>
						Login
					</Link>
					<Link to="/new" className={buttonVariants()}>
						Request demo
					</Link>
				</div>
			</div>
		</header>
	);
}
