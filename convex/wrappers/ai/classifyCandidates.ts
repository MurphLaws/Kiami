// Tool #2 from the roadmap: candidate classification.
//
// Same shape as classify-leads but with role-fit / seniority-match /
// recommendation outputs tuned to a hiring brief.

import { generateText, Output } from "ai";

import type { NormalizedLead } from "../../searchTypes";
import { MODEL_IDS } from "./model";
import { buildClassificationSystemPrompt } from "./prompts";
import {
	candidateClassificationsSchema,
	type CandidateClassification,
} from "./schemas";

export async function classifyCandidates(args: {
	originalBrief: string;
	leads: NormalizedLead[];
}): Promise<CandidateClassification[]> {
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
	}));

	const userPrompt = [
		"Original brief:",
		args.originalBrief.trim(),
		"",
		"Candidates (return one classification per index, in the same order):",
		JSON.stringify(summary, null, 2),
	].join("\n");

	const { output } = await generateText({
		model: MODEL_IDS.classify,
		temperature: 0.1,
		messages: [
			{
				role: "system",
				content: buildClassificationSystemPrompt("candidate"),
			},
			{ role: "user", content: userPrompt },
		],
		output: Output.object({
			name: "CandidateClassifications",
			schema: candidateClassificationsSchema,
		}),
	});

	const parsed = (output as { classifications: CandidateClassification[] })
		.classifications;
	const byIndex = new Map<number, CandidateClassification>();
	for (const c of parsed) byIndex.set(c.i, c);

	return args.leads.map(
		(_, i) => byIndex.get(i) ?? defaultCandidateClassification(i),
	);
}

function defaultCandidateClassification(i: number): CandidateClassification {
	return {
		i,
		role_fit: "low",
		seniority_match: "match",
		recommendation: "pass",
		reasoning: "no classification returned",
	};
}
