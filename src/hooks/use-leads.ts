import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "../../convex/_generated/api";

export function leadsQueryOptions() {
	return convexQuery(api.leads.list, {});
}

export function useLeads() {
	return useSuspenseQuery(leadsQueryOptions());
}
