import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { useLeads } from "../../hooks/use-leads";

export const Route = createFileRoute("/_authenticated/authenticated")({
	component: AuthenticatedPage,
});

function AuthenticatedPage() {
	return (
		<main className="p-8">
			<h1 className="text-2xl font-bold mb-4">Leads</h1>
			<Suspense fallback={<LeadsSkeleton />}>
				<LeadsList />
			</Suspense>
		</main>
	);
}

function LeadsList() {
	const { data: leads } = useLeads();

	if (!leads.length) {
		return <p className="text-muted-foreground">No leads found.</p>;
	}

	return (
		<ul className="flex flex-col gap-2">
			{leads.map((lead) => (
				<li key={lead._id} className="border rounded-md p-4">
					<p className="font-medium">{lead.name}</p>
					<p className="text-sm text-muted-foreground">{lead.email}</p>
					<p className="text-sm text-muted-foreground">{lead.phoneNumber}</p>
				</li>
			))}
		</ul>
	);
}

function LeadsSkeleton() {
	return (
		<ul className="flex flex-col gap-2">
			{Array.from({ length: 3 }).map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: demo
				<li key={i} className="border rounded-md p-4 animate-pulse">
					<div className="h-4 bg-muted rounded w-1/3 mb-2" />
					<div className="h-3 bg-muted rounded w-1/2" />
				</li>
			))}
		</ul>
	);
}
