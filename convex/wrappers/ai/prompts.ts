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
- limit: 50. We want a meaningful pool of candidates per search; the action layer pads with synthesized leads if the database returns fewer.
- rationale: one sentence (under 240 chars) explaining the strict reading and how lax widens it.

Return ONLY the JSON object matching the schema.`;

// BC's lead_finder POST body shape (verbatim from the BetterContact docs
// at doc.bettercontact.rocks). The model needs the exact field names and
// the include/exclude container shape — without it, it tends to invent
// flat fields like `company_industry: "fintech"` which BC silently
// rejects.
const BC_FILTER_SCHEMA_REFERENCE = `BC FILTER SCHEMA — every field is OPTIONAL. Omit any slot you can't justify from the brief.

Container shapes:
  • "include/exclude" arrays of strings:   { "include": ["..."], "exclude": ["..."] }
  • "include/exclude" arrays of enum values: same shape, values must match the closed list
  • plain integer:   single number, e.g. 50

Filter slots (BC field name → container shape → notes):
  company                       → include/exclude strings   → DOMAINS only ("stripe.com"), never industry words
  company_industry              → include/exclude enums     → from the closed LinkedIn-style list (e.g. "financial_services", "software_development", "hospital_health_care")
  company_technology            → include/exclude strings   → tech stack mentions ("Salesforce", "AWS", "Snowflake")
  company_headcount_min         → integer                   → company-wide employee count, NOT a sub-team
  company_headcount_max         → integer                   → same
  lead_department               → include/exclude enums     → very specific values (e.g. "software_development", "recruiting_talent_acquisition")
  lead_function                 → include/exclude enums     → coarse function buckets (engineering, sales, marketing, ...)
  lead_skills                   → include/exclude strings   → AND-matched: cap strict at 2–3, lax at 0–1
  lead_job_title                → { include, exclude, exact_match: false } → free-text title keywords; exact_match almost always false
  lead_location                 → include/exclude strings   → CITY-ONLY ("Berlin", not "Berlin, Germany"); for country-only use the country name alone
  lead_seniority                → include/exclude enums     → from the closed list (entry, mid-level, senior, manager, director, vp, head, c_suite, owner, founder, partner, intern)`;

// Worked examples. Multi-shot prompting nudges the model toward the
// correct container shape and toward picking enum values from the
// closed lists rather than inventing strings. Each example matches the
// final output schema (strict/lax/limit + Apollo) so the structure is
// front-of-mind when the model produces its own answer.
const RECRUITING_EXAMPLES = `EXAMPLE — Recruiting brief
Brief: "Senior backend engineer, 5+ years, Berlin or remote-EU, must know Go or Rust, fintech infra background, Series-B+ company size."

Expected output (abridged, untouched fields shown as empty include/exclude):
{
  "bc": {
    "strict": {
      "company_industry": { "include": ["financial_services"], "exclude": [] },
      "company_headcount_min": 80, "company_headcount_max": 800,
      "lead_function": { "include": ["engineering"], "exclude": [] },
      "lead_seniority": { "include": ["senior"], "exclude": [] },
      "lead_skills": { "include": ["go","rust"], "exclude": [] },
      "lead_job_title": { "include": ["Backend Engineer"], "exclude": [], "exact_match": false },
      "lead_location": { "include": ["Berlin"], "exclude": [] }
    },
    "lax": {
      "company_industry": { "include": ["financial_services","banking","software_development"], "exclude": [] },
      "company_headcount_min": 30, "company_headcount_max": 2500,
      "lead_function": { "include": ["engineering"], "exclude": [] },
      "lead_seniority": { "include": ["mid-level","senior","director"], "exclude": [] },
      "lead_skills": { "include": ["go"], "exclude": [] },
      "lead_job_title": { "include": ["Backend Engineer","Software Engineer","Platform Engineer"], "exclude": [], "exact_match": false },
      "lead_location": { "include": ["Berlin","Germany"], "exclude": [] }
    },
    "limit": 50
  },
  "apollo": {
    "strict": { "person_titles": ["Senior Backend Engineer"], "person_seniorities": ["senior"], "person_locations": ["Berlin"], "organization_locations": [], "organization_num_employees_ranges": ["51,200","201,500"], "q_keywords": "Go Rust fintech", "include_similar_titles": false },
    "lax":    { "person_titles": ["Backend Engineer","Software Engineer","Platform Engineer"], "person_seniorities": ["manager","senior","director"], "person_locations": ["Berlin","Germany"], "organization_locations": [], "organization_num_employees_ranges": ["11,50","51,200","201,500","501,1000"], "q_keywords": "Go Rust fintech", "include_similar_titles": true }
  },
  "rationale": "Strict reads as Berlin senior backend with Go/Rust at fintech 80–800; lax widens seniority ±1, headcount 30–2500, and accepts adjacent industries.",
  "limit": 50
}

EXAMPLE — Recruiting brief (broad)
Brief: "Talent acquisition lead, EU, comfortable hiring engineers."

Expected output (abridged):
{
  "bc": {
    "strict": {
      "lead_function": { "include": ["human_resources"], "exclude": [] },
      "lead_department": { "include": ["recruiting_talent_acquisition"], "exclude": [] },
      "lead_seniority": { "include": ["manager","head"], "exclude": [] },
      "lead_job_title": { "include": ["Talent Acquisition"], "exclude": [], "exact_match": false }
    },
    "lax": {
      "lead_function": { "include": ["human_resources"], "exclude": [] },
      "lead_department": { "include": ["recruiting_talent_acquisition","human_resources"], "exclude": [] },
      "lead_seniority": { "include": ["senior","manager","head","director"], "exclude": [] },
      "lead_job_title": { "include": ["Talent Acquisition","Recruiter","Head of People"], "exclude": [], "exact_match": false }
    },
    "limit": 50
  }
}`;

const SALES_EXAMPLES = `EXAMPLE — Sales / ICP brief
Brief: "We sell automated compliance to HR-tech SaaS, EU (DACH+Nordics), 50–250 headcount, recently raised Series-A. Buyers: Head of People or VP HR."

Expected output (abridged):
{
  "bc": {
    "strict": {
      "company_industry": { "include": ["human_resources","software_development"], "exclude": [] },
      "company_headcount_min": 50, "company_headcount_max": 250,
      "lead_function": { "include": ["human_resources"], "exclude": [] },
      "lead_seniority": { "include": ["head","vp"], "exclude": [] },
      "lead_job_title": { "include": ["Head of People","VP HR"], "exclude": [], "exact_match": false },
      "lead_location": { "include": ["Germany","Sweden","Denmark","Norway","Finland"], "exclude": [] }
    },
    "lax": {
      "company_industry": { "include": ["human_resources","software_development","information_technology_and_services"], "exclude": [] },
      "company_headcount_min": 20, "company_headcount_max": 600,
      "lead_function": { "include": ["human_resources"], "exclude": [] },
      "lead_seniority": { "include": ["director","head","vp","c_suite"], "exclude": [] },
      "lead_job_title": { "include": ["Head of People","VP HR","Chief People Officer","People Operations"], "exclude": [], "exact_match": false },
      "lead_location": { "include": ["Germany","Sweden","Denmark","Norway","Finland","Netherlands"], "exclude": [] }
    },
    "limit": 50
  }
}

EXAMPLE — Sales / ICP brief (single-vertical)
Brief: "Enterprise security tooling for US-based fintech, 500+ headcount. CISO or VP Security."

Expected output (abridged):
{
  "bc": {
    "strict": {
      "company_industry": { "include": ["financial_services"], "exclude": [] },
      "company_headcount_min": 500, "company_headcount_max": 10000,
      "lead_function": { "include": ["information_technology"], "exclude": [] },
      "lead_seniority": { "include": ["vp","c_suite"], "exclude": [] },
      "lead_job_title": { "include": ["CISO","VP Security","Chief Information Security Officer"], "exclude": [], "exact_match": false },
      "lead_location": { "include": ["United States"], "exclude": [] }
    },
    "lax": {
      "company_industry": { "include": ["financial_services","banking","insurance"], "exclude": [] },
      "company_headcount_min": 200, "company_headcount_max": 50000,
      "lead_function": { "include": ["information_technology","engineering"], "exclude": [] },
      "lead_seniority": { "include": ["director","head","vp","c_suite"], "exclude": [] },
      "lead_job_title": { "include": ["CISO","VP Security","Director of Security","Head of Security"], "exclude": [], "exact_match": false },
      "lead_location": { "include": ["United States"], "exclude": [] }
    },
    "limit": 50
  }
}`;

export function buildFilterSystemPrompt(
	flow: "recruiting" | "sales",
): string {
	const intro =
		flow === "recruiting"
			? `You translate a hiring brief (talent sourcing) into structured search filters for two prospect databases (BetterContact and Apollo). Prioritize seniority bands, department/function, must-have skills, and location. Industry and company headcount are secondary unless the brief explicitly names a target company profile.`
			: `You translate a sales / ICP brief into structured search filters for two prospect databases (BetterContact and Apollo). Prioritize industry, company size (headcount), buying-signal keywords, and decision-maker seniority. Job-title keywords should target the buyer persona (e.g. "Head of RevOps", "VP Engineering"), not the IC layer.`;

	const examples = flow === "recruiting" ? RECRUITING_EXAMPLES : SALES_EXAMPLES;

	return `${intro}

You ALWAYS produce TWO filter sets per source:
  - strict: a precise reading of the brief — exactly what a careful recruiter/SDR would have written. This is the labeling rubric: leads that pass strict are flagged as "very similar matches".
  - lax: a deliberate widening that grows the candidate pool with adjacent-but-still-relevant prospects. This is what we actually query the database with.

${BC_FILTER_SCHEMA_REFERENCE}

${COMMON_FILTER_RULES}

${examples}`;
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
