// Tool #1 from the roadmap: lead classification.
//
// Batched: takes the full lead set and returns one classification per
// lead, in the same order as the input. Uses the cheapest model since
// the output is short, structured, and per-row.

import { generateText, Output } from "ai";

import type { NormalizedLead } from "../../searchTypes";
import { MODEL_IDS } from "./model";
import { buildClassificationSystemPrompt } from "./prompts";
import {
	leadClassificationsSchema,
	type LeadClassification,
} from "./schemas";

export async function classifyLeads(args: {
	originalBrief: string;
	leads: NormalizedLead[];
}): Promise<LeadClassification[]> {
	if (args.leads.length === 0) return [];

	const summary = args.leads.map((l, i) => ({
		i,
		name: l.full_name,
		title: l.job_title ?? null,
		seniority: l.seniority ?? null,
		location: l.location ?? null,
		company: l.company_name ?? null,
		industry: l.company_industry ?? null,
		company_domain: l.company_domain ?? null,
		company_headcount: l.company_headcount ?? null,
	}));

	const userPrompt = [
		"Original brief:",
		args.originalBrief.trim(),
		"",
		"Leads (return one classification per index, in the same order):",
		JSON.stringify(summary, null, 2),
	].join("\n");

	const { output } = await generateText({
		model: MODEL_IDS.classify,
		temperature: 0.1,
		messages: [
			{
				role: "system",
				content: buildClassificationSystemPrompt("lead"),
			},
			{ role: "user", content: userPrompt },
		],
		output: Output.object({
			name: "LeadClassifications",
			schema: leadClassificationsSchema,
		}),
	});

	const parsed = (output as { classifications: LeadClassification[] })
		.classifications;
	const byIndex = new Map<number, LeadClassification>();
	for (const c of parsed) byIndex.set(c.i, c);

	return args.leads.map((_, i) => byIndex.get(i) ?? defaultLeadClassification(i));
}

function defaultLeadClassification(i: number): LeadClassification {
	return {
		i,
		tier: "cold",
		icp_fit: "low",
		confidence: 0,
		reasoning: "no classification returned",
	};
}
