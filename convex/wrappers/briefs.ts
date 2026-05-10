// Heuristic scoring + LLM-generated outreach briefs for the top results.
//
// We don't ship *every* lead with a brief — only the ones the user is most
// likely to act on. The scoring is deterministic; the brief is a single
// batched OpenAI call that returns one paragraph per lead.

import type { NormalizedLead } from "../searchTypes";

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
	// A tiny bias toward primary-index hits (more curated data).
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

export type Brief = {
	why_they_fit: string;
	suggested_opener: string;
};

const SYSTEM_PROMPT = `You write concise outreach briefs for ${"recruiters and salespeople"}.

For each person below, return:
- why_they_fit: 2 sentences, max 320 chars, explaining why this person is a strong match for the user's brief. Be specific to their job title, company, and industry — not generic praise. Never invent biographical details that aren't in the data provided.
- suggested_opener: a single short sentence (under 220 chars) the user can copy-paste into a LinkedIn DM or email as the first line. Reference one concrete signal (their company, role, or industry). Do NOT include a greeting like "Hi {name}" — just the opening line. Plain text, no markdown.

If you have very little to go on, keep the brief generic but mention what you do see (the company name, the seniority, the industry).`;

function openaiKey(): string {
	const key = process.env.OPENAI_API_KEY;
	if (!key) throw new Error("OPENAI_API_KEY is not set");
	return key;
}

export async function generateBriefs(args: {
	flow: "recruiting" | "sales";
	originalBrief: string;
	leads: NormalizedLead[];
}): Promise<Brief[]> {
	if (args.leads.length === 0) return [];
	const summary = args.leads.map((l, i) => ({
		i,
		name: l.full_name,
		title: l.job_title ?? null,
		seniority: l.seniority ?? null,
		location: l.location ?? null,
		linkedin_url: l.linkedin_url ?? null,
		company: l.company_name ?? null,
		industry: l.company_industry ?? null,
		company_domain: l.company_domain ?? null,
	}));

	const userPrompt = [
		`Mode: ${args.flow === "sales" ? "Lead Finder (sales prospecting)" : "Recruiting (talent sourcing)"}`,
		"",
		"Original brief:",
		args.originalBrief.trim(),
		"",
		"People to brief (return one entry per index, in the same order):",
		JSON.stringify(summary, null, 2),
	].join("\n");

	const responseSchema = {
		name: "OutreachBriefs",
		strict: true,
		schema: {
			type: "object",
			additionalProperties: false,
			properties: {
				briefs: {
					type: "array",
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							i: { type: "integer" },
							why_they_fit: { type: "string" },
							suggested_opener: { type: "string" },
						},
						required: ["i", "why_they_fit", "suggested_opener"],
					},
				},
			},
			required: ["briefs"],
		},
	};

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
				json_schema: responseSchema,
			},
			temperature: 0.4,
		}),
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`OpenAI briefs ${res.status}: ${text}`);
	}
	const json = (await res.json()) as {
		choices: Array<{ message: { content: string } }>;
	};
	const content = json.choices?.[0]?.message?.content;
	if (!content) throw new Error("OpenAI returned no content");
	const parsed = JSON.parse(content) as {
		briefs: Array<{ i: number; why_they_fit: string; suggested_opener: string }>;
	};
	const out: Brief[] = args.leads.map(() => ({
		why_they_fit: "",
		suggested_opener: "",
	}));
	for (const b of parsed.briefs) {
		if (b.i >= 0 && b.i < out.length) {
			out[b.i] = {
				why_they_fit: b.why_they_fit,
				suggested_opener: b.suggested_opener,
			};
		}
	}
	return out;
}
