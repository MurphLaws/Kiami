import { useAction } from "convex/react";

import { api } from "../../convex/_generated/api";

export type Flow = "recruiting" | "sales";

export type StoredBrief = {
	flow: Flow;
	brief: string;
	mode: "paste" | "form";
};

export type StoredLead = {
	source: "bettercontact" | "apollo";
	full_name: string;
	job_title?: string;
	seniority?: string;
	location?: string;
	linkedin_url?: string;
	company_name?: string;
	company_industry?: string;
	company_domain?: string;
	company_headcount?: number | string;
	high_profile?: boolean;
	match_strictness?: "strict" | "lax";
	strict_misses?: number;
	tags?: string[];
	score?: number;
	brief?: {
		why_they_fit: string;
		suggested_opener: string;
	};
	// LLM classification mirrored from convex/searchTypes.ts NormalizedLead.
	classification?:
		| {
				kind: "lead";
				tier: "hot" | "warm" | "cold";
				icp_fit: "high" | "medium" | "low";
				confidence: number;
				reasoning: string;
		  }
		| {
				kind: "candidate";
				role_fit: "high" | "medium" | "low";
				seniority_match: "over" | "match" | "under";
				recommendation: "shortlist" | "screen" | "pass";
				reasoning: string;
		  };
	// Full upstream payload (BC fields like contact_headline, company_about,
	// etc.). Populated server-side on every search; the foldable card
	// surfaces it.
	raw?: Record<string, unknown>;
};

export type StoredSearchResult = {
	rationale: string;
	leads: StoredLead[];
	bc: {
		request_id?: string;
		status?: string;
		leads_found: number;
		credits_consumed?: number;
		credits_left?: number;
		error?: string;
	};
	apollo: { ran: boolean; leads_found: number; error?: string };
	filters_used: unknown;
	finished_at: number;
};

const BRIEF_KEY = "kiami:brief";
const RESULT_KEY = "kiami:lastResult";

export function saveBrief(brief: StoredBrief) {
	if (typeof window === "undefined") return;
	sessionStorage.setItem(BRIEF_KEY, JSON.stringify(brief));
}

export function loadBrief(): StoredBrief | null {
	if (typeof window === "undefined") return null;
	const raw = sessionStorage.getItem(BRIEF_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as StoredBrief;
	} catch {
		return null;
	}
}

export function saveResult(result: StoredSearchResult) {
	if (typeof window === "undefined") return;
	sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

export function loadResult(): StoredSearchResult | null {
	if (typeof window === "undefined") return null;
	const raw = sessionStorage.getItem(RESULT_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as StoredSearchResult;
	} catch {
		return null;
	}
}

export function useRunSearch() {
	return useAction(api.search.runSearch);
}

export function useScheduleCall() {
	return useAction(api.scheduleCall.scheduleCall);
}

export function useScrapeJob() {
	return useAction(api.scrapeJob.scrapeJob);
}
