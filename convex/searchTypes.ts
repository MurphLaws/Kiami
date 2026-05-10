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
	raw: Record<string, unknown>;
};
