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
	score?: number;
	brief?: {
		why_they_fit: string;
		suggested_opener: string;
	};
	raw: Record<string, unknown>;
};
