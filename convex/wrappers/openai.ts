// OpenAI structured-output inference for filter extraction.
//
// Given a free-text brief (job description, ICP write-up, or assembled
// form summary), produce a strict JSON object with:
//   - BetterContact-shaped filters (using closed enums)
//   - Apollo-shaped filters (using Apollo's smaller seniority enum)
//   - a one-line rationale
//
// We use the Chat Completions JSON mode (response_format: json_schema)
// against gpt-4o — robust instruction-following + json_schema support, so
// it nails the closed-enum filter slots without dropping into mini's
// failure modes (mistaking team size for company size, putting industry
// words into the company-domain field, etc.).

import {
	APOLLO_SENIORITY_ENUM,
	DEPARTMENT_ENUM,
	FUNCTION_ENUM,
	INDUSTRY_ENUM,
	SENIORITY_ENUM,
} from "./enums";

export type InferredFilters = {
	bc: {
		filters: {
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
		limit: number;
	};
	apollo: {
		person_titles?: string[];
		person_seniorities?: string[];
		person_locations?: string[];
		organization_locations?: string[];
		organization_num_employees_ranges?: string[];
		q_keywords?: string;
		include_similar_titles?: boolean;
	};
	rationale: string;
};

function openaiKey(): string {
	const key = process.env.OPENAI_API_KEY;
	if (!key) throw new Error("OPENAI_API_KEY is not set");
	return key;
}

const SYSTEM_PROMPT = `You translate a hiring or sales brief into structured search filters for two prospect databases (BetterContact and Apollo).

PRIME DIRECTIVE: a missing filter never costs us a match, but a wrong filter can wipe the whole result set. Default to broad. Only populate a slot if the brief gives explicit, unambiguous evidence for it. Empty is always better than a guess.

Rules:
- Enum-typed fields MUST use exact values from the lists in the schema. Never invent values.
- BC.lead_seniority allowed values: ${SENIORITY_ENUM.join(", ")}.
- BC.lead_function allowed values: ${FUNCTION_ENUM.join(", ")}.
- BC.company_industry must come from a closed LinkedIn-style list (provided in the schema). Pick the closest match or omit. Never invent industry strings.
- BC.lead_department values are very specific (e.g. "software_development", "recruiting_talent_acquisition"). Only set when obvious.
- BC.company is the COMPANY-DOMAIN filter (e.g. "stripe.com", "rippling.com"). It is NOT a free-text industry or keyword field. Only populate it when the brief names specific company domains. If the brief just says "fintech" or "HR-Tech", DO NOT put that into BC.company — use BC.company_industry instead, or leave both empty.
- BC.lead_job_title.exact_match: default to FALSE so we get fuzzy matches. Only set TRUE when the brief explicitly demands an exact match (e.g. "exactly 'Senior Backend Engineer', no Lead/Staff").
- BC.company_headcount_min / company_headcount_max: be generous. Never produce ranges narrower than ~5x (e.g. 50–250 is fine, 85–100 is not). When the brief mentions a sub-team's size ("engineering org of ~85") that is NOT the company headcount — companies are typically 3–10x bigger than any one team. If the brief only says "Series A/B/C", infer a wide band (Series A ~10–80, Series B ~50–250, Series C+ ~200–1500) but only if the user clearly intends company size, not team size.
- Apollo.person_seniorities allowed values: ${APOLLO_SENIORITY_ENUM.join(", ")}.
- Apollo.organization_num_employees_ranges uses string ranges like "1,10", "11,50", "51,200", "201,500", "501,1000", "1001,5000", "5001,10000", "10001,1000000". Use the closest single range or two adjacent ranges.
- Apollo.include_similar_titles: default TRUE so the search isn't choked.
- Job titles: write naturally (e.g. "Senior Backend Engineer"). Do not abbreviate.
- BC.lead_skills is AND-matched. Putting 4+ skills means the contact must publicly list ALL of them, which is rare. Pick at most 2–3 must-have skills, and only ones the brief calls out as essential. If the brief lists many techs, prefer to leave lead_skills empty and let the search match on title + function instead.
- BC.lead_location values must be CITY-ONLY ("Berlin", not "Berlin, Germany", not "Berlin metropolitan area"). For country-only matching, use the country name alone ("Germany").
- limit: ALWAYS 5. We're optimizing for credit cost — do not set higher.
- rationale: one sentence (under 200 chars) explaining the choices.

Return ONLY the JSON object matching the schema.`;

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
					filters: {
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
					},
					limit: { type: "integer" },
				},
				required: ["filters", "limit"],
			},
			apollo: {
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
	const bcFilters: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(input.bc.filters)) {
		const cleaned = compact(v);
		if (cleaned !== undefined) bcFilters[k] = cleaned;
	}
	const apollo: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(input.apollo)) {
		const cleaned = compact(v);
		if (cleaned !== undefined) apollo[k] = cleaned;
	}
	return {
		bc: {
			filters: bcFilters as InferredFilters["bc"]["filters"],
			// Hard cap at 5 to control credit spend. Independent of what the
			// model returned.
			limit: clampInt(input.bc.limit ?? 5, 1, 5),
		},
		apollo: apollo as InferredFilters["apollo"],
		rationale: input.rationale ?? "",
	};
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
