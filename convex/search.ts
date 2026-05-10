"use node";

// Run a lead search:
//   1. Use OpenAI to translate the brief into TWO filter sets per source:
//      a `strict` reading (the precise interpretation) and a `lax` reading
//      (deliberately widened — ±1 seniority band, adjacent industries,
//      2-3x headcount, softer locations, fewer must-have skills).
//   2. Submit BC + Apollo with the LAX set so we get a bigger pool.
//   3. Strip BC PII (email/phone) at the BC client. Apollo people search
//      doesn't include email/phone on the free tier — exactly what we want.
//   4. For each returned lead, evaluate whether it ALSO satisfies the
//      strict set. Strict matches are tagged "strict" + flagged
//      high_profile (capped at 5); lax-only matches stay low_profile.
//   5. Score the strict matches and batch-generate one outreach brief
//      per high-profile lead via OpenAI.

import { v } from "convex/values";

import { action } from "./_generated/server";
import type { NormalizedLead } from "./searchTypes";
import {
	apolloPeopleSearch,
	type ApolloPerson,
} from "./wrappers/apollo";
import {
	pollLeadFinder,
	submitLeadFinder,
	type BcLead,
} from "./wrappers/bc";
import {
	generateBriefs,
	pickHighProfile,
	scoreLead,
} from "./wrappers/briefs";
import {
	inferFilters,
	type BcFilterSet,
	type InferredFilters,
} from "./wrappers/openai";

const APOLLO_FALLBACK_THRESHOLD = 5;

export type { NormalizedLead };

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

		// Server-side rescue: even with a tightened prompt the model still
		// occasionally produces filters that wipe the result set. Run the
		// sanitizer on both sets — strict drives high-profile labeling, so
		// the same cleanups (BC.company-as-domain, headcount widening,
		// location stripping, etc.) need to apply or labeling is wrong.
		const sanitizedLax = sanitizeFilters(inferred.bc.lax);
		const sanitizedStrict = sanitizeFilters(inferred.bc.strict);
		// Hard cap the limit at 5 here too, regardless of what came back
		// from the model — credit-spend defense.
		const safeLimit = Math.min(inferred.bc.limit ?? 5, 5);

		// --- BetterContact pass (LAX filters → bigger pool) ---
		try {
			const submit = await submitLeadFinder(sanitizedLax, safeLimit);
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

		// --- Apollo fallback (LAX filters) ---
		if (result.bc.leads_found < APOLLO_FALLBACK_THRESHOLD) {
			result.apollo.ran = true;
			try {
				const apollo = await apolloPeopleSearch({
					...inferred.apollo.lax,
					per_page: 5,
				});
				const people = apollo.people ?? [];
				result.apollo.leads_found = people.length;
				result.leads.push(...people.map(normalizeApolloPerson));
			} catch (err) {
				result.apollo.error =
					err instanceof Error ? err.message : String(err);
			}
		}

		// --- Tag strictness, score, pick high-profile, generate briefs ---
		// A lead matches strict only if it satisfies every populated slot
		// in the strict BC filter set (industry, headcount, seniority,
		// location, title keywords). Missing data on the lead = not a
		// confident strict match → labeled lax.
		for (const lead of result.leads) {
			lead.match_strictness = matchesStrict(lead, sanitizedStrict)
				? "strict"
				: "lax";
			lead.score = scoreLead(lead);
		}
		const eligible = result.leads
			.map((l, i) => (l.match_strictness === "strict" ? i : -1))
			.filter((i) => i >= 0);
		const hpIndices = pickHighProfile(result.leads, eligible);
		for (const i of hpIndices) result.leads[i].high_profile = true;

		if (hpIndices.length > 0) {
			try {
				const subset = hpIndices.map((i) => result.leads[i]);
				const briefs = await generateBriefs({
					flow: args.flow,
					originalBrief: args.brief,
					leads: subset,
				});
				hpIndices.forEach((leadIdx, briefIdx) => {
					const b = briefs[briefIdx];
					if (b && (b.why_they_fit || b.suggested_opener)) {
						result.leads[leadIdx].brief = b;
					}
				});
			} catch (err) {
				// Briefs are a best-effort enhancement; never let them fail
				// the whole search.
				console.error("brief generation failed", err);
			}
		}

		return result;
	},
});

// Defense layer between the LLM and BetterContact. Even with a strong
// prompt, the model occasionally picks filters that nuke the result set.
// We strip the most common offenders here so the user gets matches
// instead of silence.
function sanitizeFilters(
	filters: BcFilterSet,
): Record<string, unknown> {
	// Shallow clone — the model's output, after compactFilters, is a plain
	// object tree; we only mutate at known keys.
	const out: Record<string, unknown> = { ...filters };

	// 1. BC.company is a DOMAIN filter. If the model put industry words
	//    like "fintech" or "HR-Tech" in there, drop the bad entries.
	if (out.company && typeof out.company === "object") {
		const co = out.company as { include?: string[]; exclude?: string[] };
		const goodInclude = (co.include ?? []).filter(looksLikeDomain);
		const goodExclude = (co.exclude ?? []).filter(looksLikeDomain);
		if (goodInclude.length === 0 && goodExclude.length === 0) {
			delete out.company;
		} else {
			out.company = {
				...(goodInclude.length ? { include: goodInclude } : {}),
				...(goodExclude.length ? { exclude: goodExclude } : {}),
			};
		}
	}

	// 2. Headcount: if min/max produce a band tighter than 4x, widen
	//    around the midpoint. The classic failure mode is the model
	//    reading "engineering team of ~85" as company headcount = 85.
	const minRaw = out.company_headcount_min;
	const maxRaw = out.company_headcount_max;
	const min =
		typeof minRaw === "number" && Number.isFinite(minRaw) ? minRaw : null;
	const max =
		typeof maxRaw === "number" && Number.isFinite(maxRaw) ? maxRaw : null;
	if (min !== null && max !== null && min > 0 && max > 0) {
		const ratio = max / min;
		if (ratio < 4) {
			const mid = Math.sqrt(min * max);
			out.company_headcount_min = Math.max(1, Math.round(mid / 3));
			out.company_headcount_max = Math.max(
				out.company_headcount_min as number,
				Math.round(mid * 3),
			);
		}
	}

	// 3. lead_job_title: default exact_match to false. Exact matches
	//    against BC's index miss too many obvious variants
	//    (e.g. "Senior Backend Engineer" vs "Sr. Backend Engineer").
	if (out.lead_job_title && typeof out.lead_job_title === "object") {
		const jt = out.lead_job_title as {
			include?: string[];
			exclude?: string[];
			exact_match?: boolean;
		};
		if (jt.exact_match === true) {
			out.lead_job_title = { ...jt, exact_match: false };
		}
	}

	// 4. lead_skills is AND-matched. Cap at 3 entries to avoid empty
	//    result sets. We pick the first 3 in the include list since the
	//    model is prompted to list them by importance.
	if (out.lead_skills && typeof out.lead_skills === "object") {
		const sk = out.lead_skills as { include?: string[]; exclude?: string[] };
		if (sk.include && sk.include.length > 3) {
			out.lead_skills = { ...sk, include: sk.include.slice(0, 3) };
		}
	}

	// 5. lead_location: BC matches the literal string, so "Berlin,
	//    Germany" misses contacts whose location is just "Berlin".
	//    Strip everything after the first comma and drop region/metro
	//    qualifiers.
	if (out.lead_location && typeof out.lead_location === "object") {
		const loc = out.lead_location as {
			include?: string[];
			exclude?: string[];
		};
		const clean = (xs?: string[]) =>
			(xs ?? [])
				.map((s) =>
					s
						.split(",")[0]
						.replace(/metropolitan area|metro area|metro|area/gi, "")
						.trim(),
				)
				.filter(Boolean);
		const inc = clean(loc.include);
		const exc = clean(loc.exclude);
		if (inc.length === 0 && exc.length === 0) {
			delete out.lead_location;
		} else {
			out.lead_location = {
				...(inc.length ? { include: inc } : {}),
				...(exc.length ? { exclude: exc } : {}),
			};
		}
	}

	return out;
}

// Evaluate a returned lead against the (sanitized) STRICT BC filter set.
// A lead "matches strict" iff for every populated slot in the strict set,
// the lead exposes data that satisfies the constraint. Missing data on
// the lead means we can't be confident, so we return false — high-profile
// flagging needs affirmative evidence, not benefit of the doubt.
function matchesStrict(
	lead: NormalizedLead,
	strict: Record<string, unknown>,
): boolean {
	// Industry — substring match either direction so "Financial Services"
	// satisfies a strict ["financial_services"] (BC stores both spellings
	// at different layers).
	const industry = strict.company_industry as
		| { include?: string[] }
		| undefined;
	if (industry?.include?.length) {
		if (!lead.company_industry) return false;
		const li = lead.company_industry.toLowerCase().replace(/[_-]/g, " ");
		const hit = industry.include.some((s) => {
			const x = s.toLowerCase().replace(/[_-]/g, " ");
			return li.includes(x) || x.includes(li);
		});
		if (!hit) return false;
	}

	// Headcount range
	const hcMin = strict.company_headcount_min as number | undefined;
	const hcMax = strict.company_headcount_max as number | undefined;
	if (hcMin != null || hcMax != null) {
		const raw = lead.company_headcount;
		const hc =
			typeof raw === "number"
				? raw
				: typeof raw === "string"
					? parseInt(raw.replace(/[^0-9]/g, ""), 10)
					: Number.NaN;
		if (!Number.isFinite(hc)) return false;
		if (hcMin != null && hc < hcMin) return false;
		if (hcMax != null && hc > hcMax) return false;
	}

	// Seniority — exact (normalized) enum match
	const sen = strict.lead_seniority as { include?: string[] } | undefined;
	if (sen?.include?.length) {
		if (!lead.seniority) return false;
		const ls = lead.seniority.toLowerCase().trim().replace(/[\s-]+/g, "_");
		const hit = sen.include.some(
			(s) => s.toLowerCase().trim().replace(/[\s-]+/g, "_") === ls,
		);
		if (!hit) return false;
	}

	// Location — substring (lead may be "Berlin, Germany"; strict "Berlin")
	const loc = strict.lead_location as { include?: string[] } | undefined;
	if (loc?.include?.length) {
		if (!lead.location) return false;
		const ll = lead.location.toLowerCase();
		const hit = loc.include.some((s) => ll.includes(s.toLowerCase()));
		if (!hit) return false;
	}

	// Job title — substring keyword match
	const jt = strict.lead_job_title as { include?: string[] } | undefined;
	if (jt?.include?.length) {
		if (!lead.job_title) return false;
		const lt = lead.job_title.toLowerCase();
		const hit = jt.include.some((s) => lt.includes(s.toLowerCase()));
		if (!hit) return false;
	}

	return true;
}

function looksLikeDomain(s: string): boolean {
	// e.g. "stripe.com", "rippling.com", "sub.example.co.uk".
	// Reject things like "fintech", "HR-Tech", "payments".
	return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(s.trim());
}

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
