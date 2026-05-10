// Heuristic scoring + high-profile pick.
//
// Deterministic, no LLM. Lifted verbatim from the old briefs.ts.

import type { NormalizedLead } from "../../searchTypes";

const RANK = {
	c_suite: 110,
	"c-suite": 110,
	founder: 105,
	owner: 100,
	partner: 95,
	vp: 92,
	head: 88,
	director: 80,
	manager: 65,
	senior: 55,
	"mid-level": 40,
	entry: 25,
	intern: 10,
} as const;

const TITLE_SIGNALS: Array<{ rx: RegExp; score: number }> = [
	{ rx: /\bchief\b|\bcxo\b/i, score: 35 },
	{ rx: /\bvp\b|\bvice president\b/i, score: 25 },
	{ rx: /\bhead of\b/i, score: 20 },
	{ rx: /\bdirector\b/i, score: 15 },
	{ rx: /\blead\b/i, score: 10 },
];

export function scoreLead(lead: NormalizedLead): number {
	let s = 0;
	const sen = (lead.seniority ?? "").toLowerCase();
	if (sen) s += RANK[sen as keyof typeof RANK] ?? 30;

	const title = (lead.job_title ?? "").toLowerCase();
	for (const { rx, score } of TITLE_SIGNALS) if (rx.test(title)) s += score;

	if (lead.linkedin_url) s += 8;
	if (lead.company_name) s += 4;
	if (lead.company_industry) s += 3;
	if (lead.company_domain) s += 2;
	if (lead.source === "bettercontact") s += 5;
	return s;
}

// Pick which leads get the "high profile" badge + an outreach brief.
//
// Caller passes the indices that are eligible (typically: leads that
// matched the strict filter set). We score that pool and return the
// top 5. If the pool is empty, no leads get flagged.
export function pickHighProfile(
	leads: NormalizedLead[],
	eligible?: number[],
): number[] {
	const pool = eligible ?? leads.map((_, i) => i);
	if (pool.length === 0) return [];
	const ranked = pool
		.slice()
		.sort((a, b) => scoreLead(leads[b]) - scoreLead(leads[a]));
	return ranked.slice(0, 5);
}
