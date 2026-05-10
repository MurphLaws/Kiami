// Prompt builders for filter generation + classification.
//
// The filter prompts mirror the original SYSTEM_PROMPT from
// convex/wrappers/openai.ts, split by flow so each variant emphasizes
// the criteria the model should treat as primary.

import {
	APOLLO_SENIORITY_ENUM,
	DEPARTMENT_ENUM,
	FUNCTION_ENUM,
	SENIORITY_ENUM,
} from "../enums";

const COMMON_FILTER_RULES = `PRIME DIRECTIVE: a missing filter never costs us a match, but a wrong filter wipes the whole result set. Default to broad. Only populate a slot if the brief gives explicit, unambiguous evidence for it.

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
- BC.lead_department values are very specific (e.g. "software_development", "recruiting_talent_acquisition"). Only set when obvious. Allowed values: ${DEPARTMENT_ENUM.slice(0, 40).join(", ")}, …
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

export function buildFilterSystemPrompt(
	flow: "recruiting" | "sales",
): string {
	const intro =
		flow === "recruiting"
			? `You translate a hiring brief (talent sourcing) into structured search filters for two prospect databases (BetterContact and Apollo). Prioritize seniority bands, department/function, must-have skills, and location. Industry and company headcount are secondary unless the brief explicitly names a target company profile.`
			: `You translate a sales / ICP brief into structured search filters for two prospect databases (BetterContact and Apollo). Prioritize industry, company size (headcount), buying-signal keywords, and decision-maker seniority. Job-title keywords should target the buyer persona (e.g. "Head of RevOps", "VP Engineering"), not the IC layer.`;

	return `${intro}

You ALWAYS produce TWO filter sets per source:
  - strict: a precise reading of the brief — exactly what a careful recruiter/SDR would have written. This is the labeling rubric: leads that pass strict are flagged as "very similar matches".
  - lax: a deliberate widening that grows the candidate pool with adjacent-but-still-relevant prospects. This is what we actually query the database with.

${COMMON_FILTER_RULES}`;
}

export function buildClassificationSystemPrompt(
	kind: "lead" | "candidate",
): string {
	if (kind === "lead") {
		return `You are scoring sales prospects against an ICP brief.

For each lead in the input array, decide:
  - tier: one of "hot" / "warm" / "cold". Hot = obvious match on industry + seniority + role; warm = partial match (e.g. right industry but adjacent seniority); cold = weak match or large gaps.
  - icp_fit: one of "high" / "medium" / "low". High = fits every populated slot of the brief; medium = fits most but not all; low = only loosely related.
  - confidence: a number in [0, 1] reflecting how much signal you had. Sparse data (no industry, no title) → low confidence even if the tier looks good.
  - reasoning: one short sentence (under 200 chars) citing the concrete data points you used.

Be conservative when data is sparse. A lead with only a name and a company should never be "hot".

Return ONE classification per input index, with the same \`i\` value. Do not skip rows; if data is missing, return tier="cold", icp_fit="low", confidence=0.1, reasoning="insufficient data".`;
	}

	return `You are scoring candidates against a hiring brief.

For each lead in the input array, decide:
  - role_fit: one of "high" / "medium" / "low". High = title + skills clearly match the role; medium = adjacent role or partial skill match; low = wrong function or wrong layer.
  - seniority_match: one of "over" / "match" / "under". "over" = candidate is more senior than the brief asks; "under" = less senior; "match" = same band ±1.
  - recommendation: one of "shortlist" / "screen" / "pass". Shortlist = top candidates worth contacting now; screen = worth a 15-min call to confirm; pass = clear mismatch.
  - reasoning: one short sentence (under 200 chars) citing the concrete data points you used.

Be conservative when data is sparse. A lead with only a name and a company should never be "shortlist".

Return ONE classification per input index, with the same \`i\` value. Do not skip rows; if data is missing, return role_fit="low", seniority_match="match", recommendation="pass", reasoning="insufficient data".`;
}
