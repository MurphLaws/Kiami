// Shared lead shape used by the search action and the brief generator.

export type NormalizedLead = {
	source: "bettercontact" | "apollo" | "synthesized";
	full_name: string;
	job_title?: string;
	seniority?: string;
	location?: string;
	linkedin_url?: string;
	company_name?: string;
	company_industry?: string;
	company_domain?: string;
	company_headcount?: number | string;
	// Demo-only contact details. Generated server-side (deterministic
	// from name + company domain) so the editorial fold has something to
	// show without spending BC enrichment credits.
	email?: string;
	phone?: string;
	high_profile?: boolean;
	// Whether this lead also passes the strict reading of the brief
	// (`strict`) or only the widened lax filters (`lax`). Set server-side
	// after the lax search returns.
	match_strictness?: "strict" | "lax";
	// Number of populated strict-filter slots this lead misses. 0 = exact
	// match, 1–2 = "affine" (still high-profile material), 3+ = lax-only.
	strict_misses?: number;
	// Hashtag-style chips derived from the lead's data + the inferred
	// filters (e.g. ["#senior", "#berlin", "#go", "#fintech"]). Used by
	// the contacts UI for accumulable tag filtering.
	tags?: string[];
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
