// Outreach-brief generation for the top high-profile leads.
//
// Same single-call batched shape as before: one entry per index, in the
// same order as the input. The model writes a 2-sentence "why_they_fit"
// and a short opener line per lead.

import { generateText, Output } from "ai";

import type { NormalizedLead } from "../../searchTypes";
import { MODEL_IDS } from "./model";
import { briefsSchema, type Brief } from "./schemas";

const SYSTEM_PROMPT = `You write concise outreach briefs for recruiters and salespeople.

For each person below, return:
- why_they_fit: 2 sentences, max 320 chars, explaining why this person is a strong match for the user's brief. Be specific to their job title, company, and industry — not generic praise. Never invent biographical details that aren't in the data provided.
- suggested_opener: a single short sentence (under 220 chars) the user can copy-paste into a LinkedIn DM or email as the first line. Reference one concrete signal (their company, role, or industry). Do NOT include a greeting like "Hi {name}" — just the opening line. Plain text, no markdown.

If you have very little to go on, keep the brief generic but mention what you do see (the company name, the seniority, the industry).`;

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

	const { output } = await generateText({
		model: MODEL_IDS.briefs,
		temperature: 0.4,
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: userPrompt },
		],
		output: Output.object({
			name: "OutreachBriefs",
			schema: briefsSchema,
		}),
	});

	const parsed = output as {
		briefs: Array<{
			i: number;
			why_they_fit: string;
			suggested_opener: string;
		}>;
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
