// OpenAI structured-output inference for filter extraction.
//
// Given a free-text brief (job description, ICP write-up, or assembled
// form summary), produce TWO filter sets in one call:
//
//   - `strict` — the closest reading of the brief: this is what gets
//     used to label returned leads as "very similar matches". Leads
//     that pass strict become high-profile.
//   - `lax`    — a deliberate widening (±1 seniority band, adjacent
//     industries, 2-3x headcount range, softer locations, fewer
//     must-have skills). This is what we actually query BC + Apollo
//     with, so we get a bigger pool to choose from.
//
// We use Chat Completions JSON mode (response_format: json_schema) on
// gpt-4o for robust instruction-following + closed-enum support.

import {
	APOLLO_SENIORITY_ENUM,
	DEPARTMENT_ENUM,
	FUNCTION_ENUM,
	INDUSTRY_ENUM,
	SENIORITY_ENUM,
} from "./enums";

export type BcFilterSet = {
	company?: { include?: string[]; exclude?: string[] };
	company_industry?: { include?: string[]; exclude?: string[] };
	company_technology?: { include?: string[]; exclude?: string[] };
	company_headcount_min?: number;
	company_headcount_max?: number;
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

function openaiKey(): string {
	const key = process.env.OPENAI_API_KEY;
	if (!key) throw new Error("OPENAI_API_KEY is not set");
	return key;
}

const SYSTEM_PROMPT = `You translate a hiring or sales brief into structured search filters for two prospect databases (BetterContact and Apollo).

You ALWAYS produce TWO filter sets per source:
  - strict: a precise reading of the brief — exactly what a careful recruiter/SDR would have written. This is the labeling rubric: leads that pass strict are flagged as "very similar matches".
  - lax: a deliberate widening that grows the candidate pool with adjacent-but-still-relevant prospects. This is what we actually query the database with.

PRIME DIRECTIVE: a missing filter never costs us a match, but a wrong filter wipes the whole result set. Default to broad. Only populate a slot if the brief gives explicit, unambiguous evidence for it.

LAX WIDENING RULES — apply each one when the corresponding strict slot is set:
  • Seniority: include the strict band ±1 neighbor on each side. e.g. strict ["senior"] → lax ["mid-level","senior","director"]. strict ["vp"] → lax ["director","vp","c_suite"]. NEVER drop the strict bands; widen around them.
  • Apollo person_seniorities: same neighbor-widening using the Apollo enum.
  • Industry (BC company_industry): include semantically adjacent industries from the same closed list. e.g. fintech → +banking, +financial_services, +insurance. Healthcare tech → +hospital_health_care, +pharmaceutical_manufacturing, +biotechnology_research. SaaS → +software_development, +information_technology_and_services. NEVER invent industries; use values from the schema enum.
  • Headcount: widen the band 2–3x around the strict midpoint. e.g. strict 50–250 → lax 25–800. If strict has no headcount, lax stays empty.
  • Apollo organization_num_employees_ranges: include the adjacent buckets on each side of the strict ones.
  • Location: soften city → country/region. e.g. strict ["Berlin"] → lax ["Berlin","Germany"]. strict ["San Francisco"] → lax ["San Francisco","Bay Area","California","United States"].
  • Apollo person_locations / organization_locations: same softening.
  • Skills (BC lead_skills): drop to at most 1 must-have, or drop entirely. AND-matched skills shrink the pool fastest.
  • Function/department: keep the strict values. Only add an adjacent function if it is closely related (e.g. engineering → +product is fine; engineering → +marketing is not).
  • Job title keywords: keep strict's keywords; add common synonyms if obvious (e.g. "Talent Acquisition" → +"Recruiter").
  • exact_match: ALWAYS false in lax (and prefer false in strict too unless the brief explicitly demands an exact match).
  • Apollo include_similar_titles: ALWAYS true in lax.

If the brief is so specific the strict version is already minimal (e.g. only one industry, no seniority constraint), the lax version may mirror strict on the untouched fields and only widen what is set. Lax must NEVER be tighter than strict.

GENERAL RULES (apply to both sets):
- Enum-typed fields MUST use exact values from the lists in the schema. Never invent values.
- BC.lead_seniority allowed values: ${SENIORITY_ENUM.join(", ")}.
- BC.lead_function allowed values: ${FUNCTION_ENUM.join(", ")}.
- BC.company_industry must come from a closed LinkedIn-style list (provided in the schema). Pick the closest match or omit. Never invent industry strings.
- BC.lead_department values are very specific (e.g. "software_development", "recruiting_talent_acquisition"). Only set when obvious.
- BC.company is the COMPANY-DOMAIN filter (e.g. "stripe.com", "rippling.com"). It is NOT a free-text industry or keyword field. Only populate it when the brief names specific company domains. If the brief just says "fintech" or "HR-Tech", DO NOT put that into BC.company — use BC.company_industry instead, or leave both empty.
- BC.company_headcount_min / company_headcount_max: be generous in strict (no narrower than ~5x), be even more generous in lax (2–3x wider). When the brief mentions a sub-team's size ("engineering org of ~85") that is NOT the company headcount — companies are typically 3–10x bigger than any one team.
- Apollo.person_seniorities allowed values: ${APOLLO_SENIORITY_ENUM.join(", ")}.
- Apollo.organization_num_employees_ranges uses string ranges like "1,10", "11,50", "51,200", "201,500", "501,1000", "1001,5000", "5001,10000", "10001,1000000". Use the closest single range or two adjacent ranges in strict, and add neighboring buckets in lax.
- Job titles: write naturally (e.g. "Senior Backend Engineer"). Do not abbreviate.
- BC.lead_skills is AND-matched. Strict picks at most 2–3 must-have skills, only ones the brief calls out as essential. Lax has at most 1 or none.
- BC.lead_location values must be CITY-ONLY ("Berlin", not "Berlin, Germany", not "Berlin metropolitan area"). For country-only matching, use the country name alone ("Germany").
- limit: ALWAYS 5. We're optimizing for credit cost — do not set higher.
- rationale: one sentence (under 240 chars) explaining the strict reading and how lax widens it.

Return ONLY the JSON object matching the schema.`;

function bcFilterSchema() {
	return {
		type: "object",
		additionalProperties: false,
		properties: {
			company: stringIncludeExclude(),
			company_industry: enumIncludeExclude(INDUSTRY_ENUM),
			company_technology: stringIncludeExclude(),
			company_headcount_min: { type: ["integer", "null"] },
			company_headcount_max: { type: ["integer", "null"] },
			lead_department: enumIncludeExclude(DEPARTMENT_ENUM),
			lead_function: enumIncludeExclude(FUNCTION_ENUM),
			lead_skills: stringIncludeExclude(),
			lead_job_title: {
				type: "object",
				additionalProperties: false,
				properties: {
					include: { type: "array", items: { type: "string" } },
					exclude: { type: "array", items: { type: "string" } },
					exact_match: { type: ["boolean", "null"] },
				},
				required: ["include", "exclude", "exact_match"],
			},
			lead_location: stringIncludeExclude(),
			lead_seniority: enumIncludeExclude(SENIORITY_ENUM),
		},
		required: [
			"company",
			"company_industry",
			"company_technology",
			"company_headcount_min",
			"company_headcount_max",
			"lead_department",
			"lead_function",
			"lead_skills",
			"lead_job_title",
			"lead_location",
			"lead_seniority",
		],
	};
}

function apolloSubschema() {
	return {
		type: "object",
		additionalProperties: false,
		properties: {
			person_titles: { type: "array", items: { type: "string" } },
			person_seniorities: {
				type: "array",
				items: { type: "string", enum: [...APOLLO_SENIORITY_ENUM] },
			},
			person_locations: { type: "array", items: { type: "string" } },
			organization_locations: {
				type: "array",
				items: { type: "string" },
			},
			organization_num_employees_ranges: {
				type: "array",
				items: { type: "string" },
			},
			q_keywords: { type: "string" },
			include_similar_titles: { type: "boolean" },
		},
		required: [
			"person_titles",
			"person_seniorities",
			"person_locations",
			"organization_locations",
			"organization_num_employees_ranges",
			"q_keywords",
			"include_similar_titles",
		],
	};
}

const RESPONSE_SCHEMA = {
	name: "InferredFilters",
	strict: true,
	schema: {
		type: "object",
		additionalProperties: false,
		properties: {
			bc: {
				type: "object",
				additionalProperties: false,
				properties: {
					strict: bcFilterSchema(),
					lax: bcFilterSchema(),
					limit: { type: "integer" },
				},
				required: ["strict", "lax", "limit"],
			},
			apollo: {
				type: "object",
				additionalProperties: false,
				properties: {
					strict: apolloSubschema(),
					lax: apolloSubschema(),
				},
				required: ["strict", "lax"],
			},
			rationale: { type: "string" },
		},
		required: ["bc", "apollo", "rationale"],
	},
};

function stringIncludeExclude() {
	return {
		type: "object",
		additionalProperties: false,
		properties: {
			include: { type: "array", items: { type: "string" } },
			exclude: { type: "array", items: { type: "string" } },
		},
		required: ["include", "exclude"],
	};
}

function enumIncludeExclude(values: readonly string[]) {
	return {
		type: "object",
		additionalProperties: false,
		properties: {
			include: {
				type: "array",
				items: { type: "string", enum: [...values] },
			},
			exclude: {
				type: "array",
				items: { type: "string", enum: [...values] },
			},
		},
		required: ["include", "exclude"],
	};
}

export async function inferFilters(brief: {
	flow: "recruiting" | "sales";
	text: string;
}): Promise<InferredFilters> {
	const userPrompt = `Flow: ${brief.flow}\n\nBrief:\n${brief.text}`;

	const res = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${openaiKey()}`,
		},
		body: JSON.stringify({
			model: "gpt-4o",
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{ role: "user", content: userPrompt },
			],
			response_format: {
				type: "json_schema",
				json_schema: RESPONSE_SCHEMA,
			},
			temperature: 0.2,
		}),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`OpenAI ${res.status}: ${text}`);
	}
	const json = (await res.json()) as {
		choices: Array<{ message: { content: string } }>;
	};
	const content = json.choices?.[0]?.message?.content;
	if (!content) throw new Error("OpenAI returned no content");

	const parsed = JSON.parse(content) as InferredFilters;
	return normalize(parsed);
}

// Strip empty arrays / nullish values so we don't send noise to the APIs.
function normalize(input: InferredFilters): InferredFilters {
	return {
		bc: {
			strict: compactSet(input.bc.strict) as BcFilterSet,
			lax: compactSet(input.bc.lax) as BcFilterSet,
			// Hard cap at 5 to control credit spend. Independent of what the
			// model returned.
			limit: clampInt(input.bc.limit ?? 5, 1, 5),
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
