// Shared lead shape used by the search action and the brief generator.

export type NormalizedLead = {
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
	// Whether this lead also passes the strict reading of the brief
	// (`strict`) or only the widened lax filters (`lax`). Set server-side
	// after the lax search returns.
	match_strictness?: "strict" | "lax";
	score?: number;
	brief?: {
		why_they_fit: string;
		suggested_opener: string;
	};
	// LLM-generated classification of the lead against the original brief.
	// Populated for every lead inside runSearch (one batched call per flow).
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
	raw: Record<string, unknown>;
};
