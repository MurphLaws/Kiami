// Zod schemas for every structured LLM call.
//
// Strict-mode JSON Schema (which the gateway enables for OpenAI models)
// requires every property to be present in the output, so optional fields
// use `.nullable()` instead of `.optional()`. The downstream `compact()`
// step in this file strips nulls and empty arrays before the filters reach
// BetterContact / Apollo.

import { z } from "zod";

// Enum lists are still referenced by the prompt + the post-hoc
// sanitizer; we just no longer use them as Zod enums (Gemini chokes).

// ---------- Filters (recruiting + lead) ----------

const stringIncludeExclude = z.object({
	include: z.array(z.string()),
	exclude: z.array(z.string()),
});

// Gemini's structured-output runtime rejects schemas with very large
// enum arrays ('schema produces a constraint that has too many states
// for serving') — and INDUSTRY_ENUM + DEPARTMENT_ENUM each have ~200
// entries. We relax every enum-typed include/exclude slot to plain
// strings here and rely on the prompt to keep the model inside the
// closed list. The post-hoc sanitizer in convex/search.ts drops any
// stray values that slip through.
const bcFilterSchema = z.object({
	company: stringIncludeExclude,
	company_industry: stringIncludeExclude,
	company_technology: stringIncludeExclude,
	company_headcount_min: z.number().int().nullable(),
	company_headcount_max: z.number().int().nullable(),
	// Documented BC slot for filtering by the lead's full or partial
	// name. Without this in the schema the model would smear the name
	// into lead_job_title.include and BC would search for people whose
	// title literally contains the name (returning Iris B., not Nicolas).
	lead_fullname: stringIncludeExclude,
	lead_linkedin_url: stringIncludeExclude,
	lead_department: stringIncludeExclude,
	lead_function: stringIncludeExclude,
	lead_skills: stringIncludeExclude,
	lead_job_title: z.object({
		include: z.array(z.string()),
		exclude: z.array(z.string()),
		exact_match: z.boolean().nullable(),
	}),
	lead_location: stringIncludeExclude,
	lead_seniority: stringIncludeExclude,
});

const apolloFilterSchema = z.object({
	person_titles: z.array(z.string()),
	person_seniorities: z.array(z.string()),
	person_locations: z.array(z.string()),
	organization_locations: z.array(z.string()),
	organization_num_employees_ranges: z.array(z.string()),
	q_keywords: z.string(),
	include_similar_titles: z.boolean(),
});

export const inferredFiltersSchema = z.object({
	bc: z.object({
		strict: bcFilterSchema,
		lax: bcFilterSchema,
		limit: z.number().int(),
	}),
	apollo: z.object({
		strict: apolloFilterSchema,
		lax: apolloFilterSchema,
	}),
	rationale: z.string(),
});

export type BcFilterSet = {
	company?: { include?: string[]; exclude?: string[] };
	company_industry?: { include?: string[]; exclude?: string[] };
	company_technology?: { include?: string[]; exclude?: string[] };
	company_headcount_min?: number;
	company_headcount_max?: number;
	lead_fullname?: { include?: string[]; exclude?: string[] };
	lead_linkedin_url?: { include?: string[]; exclude?: string[] };
	lead_department?: { include?: string[]; exclude?: string[] };
	lead_function?: { include?: string[]; exclude?: string[] };
	lead_skills?: { include?: string[]; exclude?: string[] };
	lead_job_title?: {
		include?: string[];
		exclude?: string[];
		exact_match?: boolean;
	};
	lead_location?: { include?: string[]; exclude?: string[] };
	lead_seniority?: { include?: string[]; exclude?: string[] };
};

export type ApolloFilterSet = {
	person_titles?: string[];
	person_seniorities?: string[];
	person_locations?: string[];
	organization_locations?: string[];
	organization_num_employees_ranges?: string[];
	q_keywords?: string;
	include_similar_titles?: boolean;
};

export type InferredFilters = {
	bc: {
		strict: BcFilterSet;
		lax: BcFilterSet;
		limit: number;
	};
	apollo: {
		strict: ApolloFilterSet;
		lax: ApolloFilterSet;
	};
	rationale: string;
};

// ---------- Briefs ----------

export const briefsSchema = z.object({
	briefs: z.array(
		z.object({
			i: z.number().int(),
			why_they_fit: z.string(),
			suggested_opener: z.string(),
		}),
	),
});

export type Brief = {
	why_they_fit: string;
	suggested_opener: string;
};

// ---------- Lead / candidate classifications ----------
//
// OpenAI structured outputs require the root to be an object, so the array
// of per-row classifications is wrapped in `{ classifications: [...] }`.

export const leadClassificationsSchema = z.object({
	classifications: z.array(
		z.object({
			i: z.number().int(),
			tier: z.enum(["hot", "warm", "cold"]),
			icp_fit: z.enum(["high", "medium", "low"]),
			confidence: z.number().min(0).max(1),
			reasoning: z.string(),
		}),
	),
});

export type LeadClassification = {
	i: number;
	tier: "hot" | "warm" | "cold";
	icp_fit: "high" | "medium" | "low";
	confidence: number;
	reasoning: string;
};

export const candidateClassificationsSchema = z.object({
	classifications: z.array(
		z.object({
			i: z.number().int(),
			role_fit: z.enum(["high", "medium", "low"]),
			seniority_match: z.enum(["over", "match", "under"]),
			recommendation: z.enum(["shortlist", "screen", "pass"]),
			reasoning: z.string(),
		}),
	),
});

export type CandidateClassification = {
	i: number;
	role_fit: "high" | "medium" | "low";
	seniority_match: "over" | "match" | "under";
	recommendation: "shortlist" | "screen" | "pass";
	reasoning: string;
};

// ---------- Fake contact info (demo) ----------
//
// Per-row email + phone, generated by an LLM agent so the values look
// plausible (locale-appropriate phone country code, name-derived local
// part, real-looking corporate domain) without spending BC enrichment
// credits.

export const contactInfosSchema = z.object({
	contacts: z.array(
		z.object({
			i: z.number().int(),
			email: z.string(),
			phone: z.string(),
		}),
	),
});

export type ContactInfo = {
	i: number;
	email: string;
	phone: string;
};

// ---------- Normalization helpers (lifted from old openai.ts) ----------

// Strip empty arrays / nullish values from the inferred filters so we don't
// send noise to BetterContact / Apollo.
export function normalizeInferredFilters(
	input: InferredFilters,
): InferredFilters {
	return {
		bc: {
			strict: compactSet(input.bc.strict) as BcFilterSet,
			lax: compactSet(input.bc.lax) as BcFilterSet,
			// BC's documented ceiling is 200; we ask for up to 80 here so
			// the LLM has headroom to request volume when the brief is
			// broad. The action layer pads the result with synthesized
			// leads to a 40–50 floor regardless.
			limit: clampInt(input.bc.limit ?? 50, 1, 200),
		},
		apollo: {
			strict: compactSet(input.apollo.strict) as ApolloFilterSet,
			lax: compactSet(input.apollo.lax) as ApolloFilterSet,
		},
		rationale: input.rationale ?? "",
	};
}

function compactSet(set: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(set)) {
		const cleaned = compact(v);
		if (cleaned !== undefined) out[k] = cleaned;
	}
	return out;
}

function compact(v: unknown): unknown {
	if (v === null || v === undefined) return undefined;
	if (Array.isArray(v)) {
		const filtered = v.filter(
			(x) => x !== null && x !== undefined && x !== "",
		);
		return filtered.length ? filtered : undefined;
	}
	if (typeof v === "object") {
		const o: Record<string, unknown> = {};
		let any = false;
		for (const [k, vv] of Object.entries(v as Record<string, unknown>)) {
			const c = compact(vv);
			if (c !== undefined) {
				o[k] = c;
				any = true;
			}
		}
		return any ? o : undefined;
	}
	if (typeof v === "string" && v.trim() === "") return undefined;
	return v;
}

function clampInt(n: number, lo: number, hi: number): number {
	if (!Number.isFinite(n)) return lo;
	return Math.max(lo, Math.min(hi, Math.floor(n)));
}
