"use node";

// Run a lead search:
//   1. Use OpenAI to translate the brief into typed BC + Apollo filters.
//   2. Submit to BetterContact and poll until terminal.
//   3. If BC returned fewer than `apolloFallbackThreshold` leads, also run
//      an Apollo people search. We tag every returned lead with `source`
//      so the UI can show who found it.
//   4. Strip BC PII (email/phone) at the BC client. Apollo people search
//      doesn't include email/phone on the free tier — exactly what we want.

import { v } from "convex/values";

import { action } from "./_generated/server";
import {
	apolloPeopleSearch,
	type ApolloPerson,
} from "./wrappers/apollo";
import {
	pollLeadFinder,
	submitLeadFinder,
	type BcLead,
} from "./wrappers/bc";
import { inferFilters, type InferredFilters } from "./wrappers/openai";

const APOLLO_FALLBACK_THRESHOLD = 5;

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
	raw: Record<string, unknown>;
};

export type SearchResult = {
	rationale: string;
	filters_used: InferredFilters;
	bc: {
		request_id?: string;
		status?: string;
		leads_found: number;
		credits_consumed?: number;
		credits_left?: number;
		error?: string;
	};
	apollo: {
		ran: boolean;
		leads_found: number;
		error?: string;
	};
	leads: NormalizedLead[];
};

export const runSearch = action({
	args: {
		flow: v.union(v.literal("recruiting"), v.literal("sales")),
		brief: v.string(),
	},
	returns: v.any(),
	handler: async (_ctx, args): Promise<SearchResult> => {
		const inferred = await inferFilters({
			flow: args.flow,
			text: args.brief,
		});

		const result: SearchResult = {
			rationale: inferred.rationale,
			filters_used: inferred,
			bc: { leads_found: 0 },
			apollo: { ran: false, leads_found: 0 },
			leads: [],
		};

		// --- BetterContact pass ---
		try {
			const submit = await submitLeadFinder(
				inferred.bc.filters,
				inferred.bc.limit,
			);
			if (!submit.request_id) {
				result.bc.error = `BC returned no request_id (${submit.message ?? "unknown"})`;
			} else {
				result.bc.request_id = submit.request_id;
				const polled = await pollLeadFinder(submit.request_id, {
					intervalMs: 5_000,
					maxMs: 4 * 60_000,
				});
				result.bc.status = polled.status;
				result.bc.credits_consumed = polled.credits_consumed;
				result.bc.credits_left = polled.credits_left;
				const bcLeads = Array.isArray(polled.leads) ? polled.leads : [];
				result.bc.leads_found =
					polled.summary?.leads_found ?? bcLeads.length;
				result.leads.push(...bcLeads.map(normalizeBcLead));
				if (polled.error) result.bc.error = polled.error;
			}
		} catch (err) {
			result.bc.error =
				err instanceof Error ? err.message : String(err);
		}

		// --- Apollo fallback ---
		if (result.bc.leads_found < APOLLO_FALLBACK_THRESHOLD) {
			result.apollo.ran = true;
			try {
				const apollo = await apolloPeopleSearch({
					...inferred.apollo,
					per_page: 25,
				});
				const people = apollo.people ?? [];
				result.apollo.leads_found = people.length;
				result.leads.push(...people.map(normalizeApolloPerson));
			} catch (err) {
				result.apollo.error =
					err instanceof Error ? err.message : String(err);
			}
		}

		return result;
	},
});

function normalizeBcLead(lead: BcLead): NormalizedLead {
	const get = (k: string) => (lead as Record<string, unknown>)[k];
	const fullName =
		(get("contact_full_name") as string | undefined) ??
		(get("contact_name") as string | undefined) ??
		[get("contact_first_name"), get("contact_last_name")]
			.filter(Boolean)
			.join(" ") ??
		"Unknown";
	return {
		source: "bettercontact",
		full_name: fullName,
		job_title: (get("contact_job_title") as string | undefined) ?? undefined,
		seniority:
			(get("contact_seniority") as string | undefined) ?? undefined,
		location:
			(get("contact_location") as string | undefined) ??
			(get("contact_city") as string | undefined) ??
			(get("contact_country") as string | undefined),
		linkedin_url:
			(get("contact_linkedin_url") as string | undefined) ?? undefined,
		company_name:
			(get("company_name") as string | undefined) ?? undefined,
		company_industry:
			(get("company_industry") as string | undefined) ?? undefined,
		company_domain:
			(get("company_domain") as string | undefined) ??
			(get("company_website") as string | undefined),
		company_headcount: get("company_headcount") as number | string | undefined,
		raw: lead as Record<string, unknown>,
	};
}

function normalizeApolloPerson(p: ApolloPerson): NormalizedLead {
	const fullName =
		p.name ??
		[p.first_name, p.last_name].filter(Boolean).join(" ") ??
		"Unknown";
	const location = [p.city, p.state, p.country].filter(Boolean).join(", ");
	return {
		source: "apollo",
		full_name: fullName,
		job_title: p.title ?? p.headline,
		linkedin_url: p.linkedin_url,
		location: location || undefined,
		company_name: p.organization?.name,
		company_industry: p.organization?.industry,
		company_domain:
			p.organization?.primary_domain ?? p.organization?.website_url,
		company_headcount: p.organization?.estimated_num_employees,
		raw: p as Record<string, unknown>,
	};
}
