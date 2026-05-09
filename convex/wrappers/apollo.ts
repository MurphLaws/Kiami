// Apollo People Search (free tier — no enrichment).
//
// People search itself does not consume Apollo credits and does not return
// email/phone — exactly what we want as a fallback when BetterContact comes
// back light on results.

const APOLLO_BASE = "https://api.apollo.io/api/v1";

function apolloKey(): string {
	const key = process.env.APOLLO_API_KEY;
	if (!key) throw new Error("APOLLO_API_KEY is not set");
	return key;
}

export type ApolloPersonFilters = {
	person_titles?: string[];
	person_seniorities?: string[];
	person_locations?: string[];
	q_keywords?: string;
	organization_locations?: string[];
	organization_num_employees_ranges?: string[];
	q_organization_domains_list?: string[];
	include_similar_titles?: boolean;
	per_page?: number;
	page?: number;
};

export type ApolloPerson = {
	id?: string;
	first_name?: string;
	last_name?: string;
	name?: string;
	title?: string;
	headline?: string;
	linkedin_url?: string;
	city?: string;
	state?: string;
	country?: string;
	organization?: {
		name?: string;
		website_url?: string;
		primary_domain?: string;
		industry?: string;
		estimated_num_employees?: number;
	};
	[k: string]: unknown;
};

export type ApolloSearchResponse = {
	people?: ApolloPerson[];
	pagination?: { page?: number; per_page?: number; total_entries?: number };
	error?: string;
};

export async function apolloPeopleSearch(
	params: ApolloPersonFilters,
): Promise<ApolloSearchResponse> {
	const body = { ...params, per_page: params.per_page ?? 25 };
	const res = await fetch(`${APOLLO_BASE}/mixed_people/api_search`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-cache",
			accept: "application/json",
			"x-api-key": apolloKey(),
		},
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`Apollo search ${res.status}: ${text}`);
	}
	return res.json();
}
