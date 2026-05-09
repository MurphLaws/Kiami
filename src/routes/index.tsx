import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/kiami/landing";
import { NavBar } from "@/components/kiami/nav-bar";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<>
			<NavBar />
			<LandingPage />
		</>
	);
}
