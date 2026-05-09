import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { KiamiLogo } from "./logo";

export function FocusedHeader() {
	return (
		<header className="flex items-center justify-between border-b bg-background px-8 py-3.5">
			<Link to="/">
				<KiamiLogo size={20} />
			</Link>
			<div className="flex items-center gap-2">
				<Button variant="ghost" size="sm">
					Save & exit
				</Button>
				<Link
					to="/dashboard"
					className={buttonVariants({ variant: "outline", size: "sm" })}
				>
					Cancel
				</Link>
			</div>
		</header>
	);
}
