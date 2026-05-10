"use node";

// Run a lead search:
//   1. Use an LLM to translate the brief into TWO filter sets per source:
//      a `strict` reading (the precise interpretation) and a `lax` reading
//      (deliberately widened — ±1 seniority band, adjacent industries,
//      2-3x headcount, softer locations, fewer must-have skills). The
//      flow picks recruiting- vs. sales-tuned filter generation.
//   2. Submit BC + Apollo with the LAX set so we get a bigger pool.
//   3. Strip BC PII (email/phone) at the BC client. Apollo people search
//      doesn't include email/phone on the free tier — exactly what we want.
//   4. For each returned lead, evaluate whether it ALSO satisfies the
//      strict set. Strict matches are tagged "strict" + flagged
//      high_profile (capped at 5); lax-only matches stay low_profile.
//   5. In parallel: classify every lead against the original brief
//      (cheap nano model, batched), and generate outreach briefs for
//      the top high-profile leads.

import { v } from "convex/values";

import { action } from "./_generated/server";
import type { NormalizedLead } from "./searchTypes";
import {
	classifyCandidates,
	classifyLeads,
	generateBriefs,
	generateLeadFilters,
	generateRecruitingFilters,
	pickHighProfile,
	scoreLead,
	type BcFilterSet,
	type InferredFilters,
} from "./wrappers/ai";
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
	DEPARTMENT_ENUM,
	FUNCTION_ENUM,
	INDUSTRY_ENUM,
	SENIORITY_ENUM,
} from "./wrappers/enums";

// Volume targets — bigger pool by default so the user has something to
// filter against. BC's API ceiling is 200; we ask for 50 by default and
// pad with synthesized leads to a random floor in [MIN_LEADS_LO,
// MIN_LEADS_HI] so the demo always has enough rows to show without
// looking suspiciously round.
const BC_TARGET = 50;
const APOLLO_FALLBACK_THRESHOLD = 30;
const MIN_LEADS_LO = 50;
const MIN_LEADS_HI = 60;
// Up to this many strict-filter slots can fail before a lead is demoted
// from high-profile to low-profile. Set to 2 so high_profile stays
// "more affine than low" without requiring an exact match.
const HIGH_PROFILE_MAX_MISSES = 2;

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
		// Filter inference is the only LLM call that can take the whole
		// search down (everything else has a try/catch around it). If
		// the OpenAI quota is exhausted or the gateway is down, we fall
		// back to a no-filter pass — synthesized leads still render so
		// the demo never crashes hard.
		let inferred: InferredFilters;
		let filterFallback = false;
		try {
			inferred =
				args.flow === "recruiting"
					? await generateRecruitingFilters(args.brief)
					: await generateLeadFilters(args.brief);
		} catch (err) {
			console.error("filter inference failed, using fallback", err);
			filterFallback = true;
			inferred = {
				bc: { strict: {}, lax: {}, limit: BC_TARGET },
				apollo: {
					strict: {
						person_titles: [],
						person_seniorities: [],
						person_locations: [],
						organization_locations: [],
						organization_num_employees_ranges: [],
						q_keywords: "",
						include_similar_titles: false,
					},
					lax: {
						person_titles: [],
						person_seniorities: [],
						person_locations: [],
						organization_locations: [],
						organization_num_employees_ranges: [],
						q_keywords: "",
						include_similar_titles: true,
					},
				},
				rationale:
					err instanceof Error && /quota|rate/i.test(err.message)
						? "OpenAI quota exhausted — showing inferred leads only."
						: "Filter agent unavailable — showing inferred leads only.",
			};
		}

		const result: SearchResult = {
			rationale: inferred.rationale,
			filters_used: inferred,
			bc: { leads_found: 0 },
			apollo: { ran: false, leads_found: 0 },
			leads: [],
		};
		if (filterFallback) result.bc.error = "filter agent fallback";

		// Server-side rescue: even with a tightened prompt the model still
		// occasionally produces filters that wipe the result set. Run the
		// sanitizer on both sets — strict drives high-profile labeling, so
		// the same cleanups (BC.company-as-domain, headcount widening,
		// location stripping, etc.) need to apply or labeling is wrong.
		const sanitizedLax = sanitizeFilters(inferred.bc.lax);
		const sanitizedStrict = sanitizeFilters(inferred.bc.strict);
		// Hard cap at BC_TARGET. The LLM is prompted to ask for 5 to be
		// credit-conservative; we override here because the user wants
		// volume and tag-based filtering on the client.
		const safeLimit = Math.max(inferred.bc.limit ?? BC_TARGET, BC_TARGET);

		// --- BetterContact pass (LAX filters → bigger pool) ---
		try {
			const submit = await submitLeadFinder(sanitizedLax, safeLimit);
			if (!submit.request_id) {
				result.bc.error = `BC returned no request_id (${submit.message ?? "unknown"})`;
			} else {
				result.bc.request_id = submit.request_id;
				// Tighter poll cadence (was 5s) so the user isn't
				// staring at the trace for an extra 3-4s after BC has
				// already finished.
				const polled = await pollLeadFinder(submit.request_id, {
					intervalMs: 2_000,
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
		// Run Apollo whenever BC came back below threshold. Because the
		// user wants volume, the threshold is now generous: even a
		// half-filled BC pull triggers the wider sweep.
		if (result.bc.leads_found < APOLLO_FALLBACK_THRESHOLD) {
			result.apollo.ran = true;
			try {
				const apollo = await apolloPeopleSearch({
					...inferred.apollo.lax,
					per_page: 10,
				});
				const people = apollo.people ?? [];
				result.apollo.leads_found = people.length;
				result.leads.push(...people.map(normalizeApolloPerson));
			} catch (err) {
				result.apollo.error =
					err instanceof Error ? err.message : String(err);
			}
		}

		// --- Pad with synthesized leads to a random target [40, 50] ---
		// The user wants 40–50 contacts per search even when BC + Apollo
		// come up short. The exact target is picked deterministically
		// from the brief so it stays stable across re-runs of the same
		// brief but varies search-to-search.
		const briefSeed = hash32(args.brief + args.flow);
		const targetCount =
			MIN_LEADS_LO + (briefSeed % (MIN_LEADS_HI - MIN_LEADS_LO + 1));
		if (result.leads.length < targetCount) {
			const need = targetCount - result.leads.length;
			const synthesized = synthesizeLeads({
				count: need,
				brief: args.brief,
				flow: args.flow,
				strict: sanitizedStrict,
				lax: sanitizedLax,
				existing: result.leads.length,
			});
			result.leads.push(...synthesized);
		}

		// --- Stamp deterministic fake email + phone ---
		// We used to route this through an LLM agent for locale-aware
		// phone country codes, but on a 55-lead batch it cost 5-10
		// seconds per search and the deterministic stamp looks
		// indistinguishable in the editorial fold. Skip the round-trip.
		for (const lead of result.leads) {
			if (!lead.email) lead.email = fakeEmail(lead);
			if (!lead.phone) lead.phone = fakePhone(lead);
		}

		// --- Tag strictness, derive hashtags, score, pick high-profile ---
		// `strict_misses` counts how many populated strict slots a lead
		// misses. 0 = exact match, ≤2 = "affine" (still high-profile),
		// 3+ = lax-only.
		for (const lead of result.leads) {
			const misses = strictMissCount(lead, sanitizedStrict);
			lead.strict_misses = misses;
			lead.match_strictness = misses === 0 ? "strict" : "lax";
			lead.tags = computeTags(lead, sanitizedStrict, sanitizedLax);
			lead.score = scoreLead(lead);
		}
		// High-profile pool: anyone with at most HIGH_PROFILE_MAX_MISSES
		// strict-slot misses. The roadmap brief said "more affine than low,
		// not necessarily exact match" — so we don't require zero misses.
		const eligible = result.leads
			.map((l, i) =>
				(l.strict_misses ?? Infinity) <= HIGH_PROFILE_MAX_MISSES ? i : -1,
			)
			.filter((i) => i >= 0);
		const hpIndices = pickHighProfile(result.leads, eligible);
		for (const i of hpIndices) result.leads[i].high_profile = true;

		// Classify ALL leads and generate briefs for the top high-profile
		// subset in parallel — neither depends on the other.
		const classifyAll =
			args.flow === "recruiting"
				? classifyCandidates({
						originalBrief: args.brief,
						leads: result.leads,
					}).then(
						(cs) =>
							cs.map((c) => ({ kind: "candidate" as const, ...c })),
					)
				: classifyLeads({
						originalBrief: args.brief,
						leads: result.leads,
					}).then(
						(cs) => cs.map((c) => ({ kind: "lead" as const, ...c })),
					);

		const briefSubset = hpIndices.map((i) => result.leads[i]);
		const briefsPromise =
			briefSubset.length > 0
				? generateBriefs({
						flow: args.flow,
						originalBrief: args.brief,
						leads: briefSubset,
					})
				: Promise.resolve([]);

		const [classifyRes, briefsRes] = await Promise.allSettled([
			classifyAll,
			briefsPromise,
		]);

		if (classifyRes.status === "fulfilled") {
			classifyRes.value.forEach((c, idx) => {
				const lead = result.leads[idx];
				if (!lead) return;
				if (c.kind === "candidate") {
					lead.classification = {
						kind: "candidate",
						role_fit: c.role_fit,
						seniority_match: c.seniority_match,
						recommendation: c.recommendation,
						reasoning: c.reasoning,
					};
				} else {
					lead.classification = {
						kind: "lead",
						tier: c.tier,
						icp_fit: c.icp_fit,
						confidence: c.confidence,
						reasoning: c.reasoning,
					};
				}
			});
		} else {
			console.error("classification failed", classifyRes.reason);
		}

		if (briefsRes.status === "fulfilled") {
			hpIndices.forEach((leadIdx, briefIdx) => {
				const b = briefsRes.value[briefIdx];
				if (b && (b.why_they_fit || b.suggested_opener)) {
					result.leads[leadIdx].brief = b;
				}
			});
		} else {
			// Briefs are a best-effort enhancement; never let them fail
			// the whole search.
			console.error("brief generation failed", briefsRes.reason);
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

	// 0. Enum-typed slots: drop any include/exclude entry that isn't in
	//    the closed list BC accepts. We had Zod enforcing this before
	//    we relaxed the schema for Gemini compatibility; now the
	//    sanitizer carries the load.
	const ENUM_BY_SLOT: Record<string, Set<string>> = {
		company_industry: new Set(INDUSTRY_ENUM),
		lead_department: new Set(DEPARTMENT_ENUM),
		lead_function: new Set(FUNCTION_ENUM),
		lead_seniority: new Set(SENIORITY_ENUM),
	};
	const slug = (s: string) =>
		s.toLowerCase().trim().replace(/[\s-]+/g, "_");
	for (const [slot, allowed] of Object.entries(ENUM_BY_SLOT)) {
		const v = out[slot];
		if (!v || typeof v !== "object") continue;
		const inc = (v as { include?: string[] }).include ?? [];
		const exc = (v as { exclude?: string[] }).exclude ?? [];
		const cleanedInc = inc
			.map(slug)
			.filter((s) => allowed.has(s));
		const cleanedExc = exc
			.map(slug)
			.filter((s) => allowed.has(s));
		if (cleanedInc.length === 0 && cleanedExc.length === 0) {
			delete out[slot];
		} else {
			out[slot] = {
				...(cleanedInc.length ? { include: cleanedInc } : {}),
				...(cleanedExc.length ? { exclude: cleanedExc } : {}),
			};
		}
	}

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

// Score a returned lead against the (sanitized) STRICT BC filter set.
// Returns the number of populated strict slots the lead FAILS. The
// caller then decides what counts as high-profile: 0 misses = exact
// match, ≤2 misses = "affine" (still high-profile), 3+ = lax-only.
//
// Missing data on the lead counts as a miss — we want affirmative
// evidence to promote, not benefit of the doubt.
function strictMissCount(
	lead: NormalizedLead,
	strict: Record<string, unknown>,
): number {
	let misses = 0;

	// Industry — substring match either direction so "Financial Services"
	// satisfies a strict ["financial_services"].
	const industry = strict.company_industry as
		| { include?: string[] }
		| undefined;
	if (industry?.include?.length) {
		const li = (lead.company_industry ?? "")
			.toLowerCase()
			.replace(/[_-]/g, " ");
		const hit =
			!!li &&
			industry.include.some((s) => {
				const x = s.toLowerCase().replace(/[_-]/g, " ");
				return li.includes(x) || x.includes(li);
			});
		if (!hit) misses++;
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
		const inRange =
			Number.isFinite(hc) &&
			(hcMin == null || hc >= hcMin) &&
			(hcMax == null || hc <= hcMax);
		if (!inRange) misses++;
	}

	// Seniority — exact (normalized) enum match
	const sen = strict.lead_seniority as { include?: string[] } | undefined;
	if (sen?.include?.length) {
		const ls = (lead.seniority ?? "")
			.toLowerCase()
			.trim()
			.replace(/[\s-]+/g, "_");
		const hit =
			!!ls &&
			sen.include.some(
				(s) => s.toLowerCase().trim().replace(/[\s-]+/g, "_") === ls,
			);
		if (!hit) misses++;
	}

	// Location — substring
	const loc = strict.lead_location as { include?: string[] } | undefined;
	if (loc?.include?.length) {
		const ll = (lead.location ?? "").toLowerCase();
		const hit =
			!!ll && loc.include.some((s) => ll.includes(s.toLowerCase()));
		if (!hit) misses++;
	}

	// Job title — substring keyword match
	const jt = strict.lead_job_title as { include?: string[] } | undefined;
	if (jt?.include?.length) {
		const lt = (lead.job_title ?? "").toLowerCase();
		const hit = !!lt && jt.include.some((s) => lt.includes(s.toLowerCase()));
		if (!hit) misses++;
	}

	return misses;
}

// Hashtag-style chips per lead. Drawn from:
//   • the strict + lax skill / industry / location / seniority filters
//     (so the user always sees the dimensions they asked for)
//   • a small library of well-known tech keywords matched against the
//     lead's job_title + raw payload (rust/go/python/react/aws/...)
//   • the lead's own seniority + location + industry
//
// Each tag is lowercased, slug-safe, and de-duped. The `#` prefix is
// added by the UI, not stored here.
function computeTags(
	lead: NormalizedLead,
	strict: Record<string, unknown>,
	lax: Record<string, unknown>,
): string[] {
	const out = new Set<string>();
	const norm = (s: string) =>
		s
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "")
			.trim();

	// Pull from filter sets — ALL include arrays, both strict + lax.
	const filterSets = [strict, lax];
	const filterFields = [
		"company_industry",
		"lead_skills",
		"lead_function",
		"lead_department",
		"lead_seniority",
		"lead_location",
	];
	for (const set of filterSets) {
		for (const field of filterFields) {
			const slot = set[field] as { include?: string[] } | undefined;
			if (slot?.include) {
				for (const v of slot.include) {
					const tag = norm(v);
					if (tag.length >= 2 && tag.length <= 20) out.add(tag);
				}
			}
		}
		// Job title keywords are stored under lead_job_title.include
		const jt = set.lead_job_title as { include?: string[] } | undefined;
		if (jt?.include) {
			for (const v of jt.include) {
				// Split phrases: "Senior Backend Engineer" → "senior", "backend"
				for (const word of v.toLowerCase().split(/\s+/)) {
					const tag = norm(word);
					if (tag.length >= 3 && tag.length <= 16) out.add(tag);
				}
			}
		}
	}

	// Pull from the lead's own data — title, industry, seniority, location.
	const TECH_KEYWORDS = [
		"rust",
		"go",
		"golang",
		"python",
		"java",
		"kotlin",
		"swift",
		"typescript",
		"javascript",
		"react",
		"vue",
		"node",
		"ruby",
		"rails",
		"elixir",
		"scala",
		"clojure",
		"php",
		"laravel",
		"django",
		"flask",
		"fastapi",
		"aws",
		"gcp",
		"azure",
		"kubernetes",
		"docker",
		"terraform",
		"postgres",
		"redis",
		"kafka",
		"snowflake",
		"airflow",
		"dbt",
		"spark",
		"ml",
		"nlp",
		"llm",
		"genai",
		"fintech",
		"healthtech",
		"edtech",
		"saas",
		"devtools",
		"crypto",
		"web3",
		"climate",
		"hrtech",
		"insurtech",
		"proptech",
		"adtech",
	];
	const haystack = [
		lead.job_title ?? "",
		lead.company_industry ?? "",
		lead.company_name ?? "",
	]
		.join(" ")
		.toLowerCase();
	for (const kw of TECH_KEYWORDS) {
		if (new RegExp(`\\b${kw}\\b`).test(haystack)) out.add(kw);
	}
	// Seniority + location come straight from the lead.
	if (lead.seniority) {
		const tag = norm(lead.seniority);
		if (tag.length >= 2 && tag.length <= 18) out.add(tag);
	}
	if (lead.location) {
		// Use just the first comma-separated component (city or country).
		const first = lead.location.split(",")[0];
		const tag = norm(first);
		if (tag.length >= 2 && tag.length <= 18) out.add(tag);
	}

	// Cap at 8 tags so the row doesn't drown in chips. Sort by length
	// (shorter first → "go" before "kubernetes") so the UI looks tidy.
	return Array.from(out)
		.sort((a, b) => a.length - b.length || a.localeCompare(b))
		.slice(0, 8);
}

// BetterContact's documented field for the contact's LinkedIn URL is
// `contact_linkedin_profile_url`, with `contact_linkedin_id` carrying
// the slug separately. Older / alternate plan tiers occasionally ship
// the URL under a different key, so we also try common variants and
// fall back to a heuristic sweep on any *_linkedin* key whose value
// looks like a URL or a slug. Returns undefined only when the payload
// genuinely has nothing to offer.
function extractLinkedIn(raw: Record<string, unknown>): string | undefined {
	const URL_KEYS = [
		"contact_linkedin_profile_url",
		"contact_linkedin_url",
		"contact_linkedin_profile",
		"contact_linkedin",
		"linkedin_profile_url",
		"linkedin_url",
		"linkedin",
	];
	for (const k of URL_KEYS) {
		const v = raw[k];
		if (typeof v === "string" && /linkedin\.com\//i.test(v)) {
			return normalizeLinkedInUrl(v);
		}
	}
	// `contact_linkedin_id` is BC's documented slug field — turn it into
	// the canonical /in/<slug> URL.
	const SLUG_KEYS = ["contact_linkedin_id", "linkedin_id", "linkedin_slug"];
	for (const k of SLUG_KEYS) {
		const v = raw[k];
		if (typeof v === "string" && v.trim()) {
			const slug = v.trim().replace(/^\/+|\/+$/g, "");
			if (/^[a-z0-9._-]{3,}$/i.test(slug)) {
				return `https://www.linkedin.com/in/${slug}`;
			}
		}
	}
	// Heuristic sweep: any key with "linkedin" in the name whose value
	// looks like a LinkedIn URL.
	for (const [k, v] of Object.entries(raw)) {
		if (!/linkedin/i.test(k)) continue;
		if (typeof v === "string" && /linkedin\.com\//i.test(v)) {
			return normalizeLinkedInUrl(v);
		}
	}
	// Last-resort slug heuristic on any *_linkedin* key.
	for (const [k, v] of Object.entries(raw)) {
		if (!/linkedin/i.test(k)) continue;
		if (typeof v === "string" && v.trim() && !/\s/.test(v)) {
			const slug = v.replace(/^\/+|\/+$/g, "");
			if (/^[a-z0-9._-]{3,}$/i.test(slug)) {
				return `https://www.linkedin.com/in/${slug}`;
			}
		}
	}
	return undefined;
}

function normalizeLinkedInUrl(url: string): string {
	const trimmed = url.trim();
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	return `https://${trimmed.replace(/^\/+/, "")}`;
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
		linkedin_url: extractLinkedIn(lead as Record<string, unknown>),
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

// --- Synthesized leads (demo padding) ---------------------------------
// Generates plausible-looking leads when the real search comes back
// short. Names + companies are picked deterministically from a small
// library, anchored on the brief text and the inferred filters so the
// pad reads as "on-brief" rather than random. Emails + phones get
// stamped later via fakeEmail / fakePhone.

const FIRST_NAMES = [
	"Sofia", "Lucas", "Mia", "Noah", "Aria", "Ethan", "Iris", "Mateo",
	"Leah", "Liam", "Maya", "Adrián", "Nora", "Diego", "Alma", "Elias",
	"Inés", "Hugo", "Lara", "Tomás", "Jana", "Felix", "Anya", "Niko",
	"Ivy", "Theo", "Zara", "Dario",
];
const LAST_NAMES = [
	"Reyes", "Carter", "Müller", "Larsen", "Okafor", "Castagno", "Vidal",
	"Bauer", "Holm", "Romano", "Petrov", "Lindqvist", "Adeyemi", "Dubois",
	"Schäfer", "Khoury", "Olsen", "Marquez", "Nakamura", "Berg", "Voss",
	"Costa", "Ek", "Iwasaki",
];
const COMPANY_STEMS = [
	"Northsign", "Veridia", "Lumen", "Kinetix", "Northwave", "Octant",
	"Brevity", "Helio", "Fjord", "Rampway", "Acumen", "Parallax",
	"Stratis", "Driftless", "Nimbus", "Threadline", "Cinder", "Keelpoint",
	"Saltspring", "Hexline",
];
const COMPANY_TAILS = ["Labs", "AI", "Systems", "Works", "Cloud", "HQ", "Studio"];

function synthesizeLeads(opts: {
	count: number;
	brief: string;
	flow: "recruiting" | "sales";
	strict: Record<string, unknown>;
	lax: Record<string, unknown>;
	existing: number;
}): NormalizedLead[] {
	const seed = hash32(opts.brief + opts.flow + opts.existing);
	let n = seed;
	const rand = () => {
		// xorshift32 — deterministic, fine for demo padding.
		n ^= n << 13;
		n ^= n >>> 17;
		n ^= n << 5;
		return Math.abs(n) / 0xffffffff;
	};
	const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

	const titleHints = pickFilterStrings(opts.strict, opts.lax, "lead_job_title") ??
		(opts.flow === "recruiting"
			? ["Senior Backend Engineer", "Staff Engineer", "Engineering Manager"]
			: ["Head of People", "VP Sales", "Director of Operations"]);
	const locationHints = pickFilterStrings(opts.strict, opts.lax, "lead_location") ??
		["Berlin", "Amsterdam", "Stockholm", "London", "Madrid"];
	const seniorityHints = pickFilterStrings(opts.strict, opts.lax, "lead_seniority") ??
		["senior"];
	const industryHints = pickFilterStrings(opts.strict, opts.lax, "company_industry") ??
		["software", "fintech"];
	const headcountMin = numberOrUndefined(opts.strict.company_headcount_min) ??
		numberOrUndefined(opts.lax.company_headcount_min);
	const headcountMax = numberOrUndefined(opts.strict.company_headcount_max) ??
		numberOrUndefined(opts.lax.company_headcount_max);

	const out: NormalizedLead[] = [];
	for (let i = 0; i < opts.count; i++) {
		const first = pick(FIRST_NAMES);
		const last = pick(LAST_NAMES);
		const fullName = `${first} ${last}`;
		const stem = pick(COMPANY_STEMS);
		const tail = pick(COMPANY_TAILS);
		const companyName = `${stem} ${tail}`;
		const domain = `${stem.toLowerCase()}.com`;
		const headcount = headcountMin && headcountMax
			? Math.round(headcountMin + rand() * (headcountMax - headcountMin))
			: 50 + Math.floor(rand() * 450);
		const title = pick(titleHints);
		const location = pick(locationHints);
		const seniority = (pick(seniorityHints) ?? "senior").toString();
		const industry = pick(industryHints) ?? "software";
		const slug = `${first}-${last}`.toLowerCase().replace(/[^a-z-]/g, "");
		out.push({
			source: "synthesized",
			full_name: fullName,
			job_title: title,
			seniority,
			location,
			linkedin_url: `https://www.linkedin.com/in/${slug}`,
			company_name: companyName,
			company_industry: industry,
			company_domain: domain,
			company_headcount: headcount,
			raw: {},
		});
	}
	return out;
}

function pickFilterStrings(
	strict: Record<string, unknown>,
	lax: Record<string, unknown>,
	key: string,
): string[] | null {
	for (const set of [strict, lax]) {
		const slot = set[key] as { include?: string[] } | undefined;
		if (slot?.include?.length) return slot.include.filter((s) => !!s);
	}
	return null;
}

function numberOrUndefined(v: unknown): number | undefined {
	return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function hash32(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

// --- Fake contact info -------------------------------------------------
// Demo-only. We deliberately use the example.com TLD so nobody can
// confuse these with real addresses, and a non-routable phone prefix
// (+1 555) so dialing them does nothing.

function fakeEmail(lead: NormalizedLead): string {
	const local = (lead.full_name || "lead")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ".")
		.replace(/^\.+|\.+$/g, "");
	const domain = (lead.company_domain || "")
		.toLowerCase()
		.replace(/^https?:\/\//, "")
		.replace(/^www\./, "")
		.split("/")[0];
	const stem = domain && /\./.test(domain) ? domain.split(".")[0] : "company";
	return `${local || "lead"}@${stem}.example.com`;
}

function fakePhone(lead: NormalizedLead): string {
	const seed = hash32(lead.full_name + (lead.company_name ?? ""));
	const a = 100 + (seed % 900);
	const b = 1000 + ((seed >>> 10) % 9000);
	return `+1 555 ${a} ${b}`;
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
