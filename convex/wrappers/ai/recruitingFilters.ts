// Tool #3 from the roadmap: recruiting filter generation.
//
// Translate a hiring brief into TWO filter sets (strict + lax) for BC + Apollo.

import { generateText, Output } from "ai";

import { MODEL_IDS } from "./model";
import { buildFilterSystemPrompt } from "./prompts";
import {
	inferredFiltersSchema,
	normalizeInferredFilters,
	type InferredFilters,
} from "./schemas";

export async function generateRecruitingFilters(
	brief: string,
): Promise<InferredFilters> {
	const { output } = await generateText({
		model: MODEL_IDS.filters,
		temperature: 0.2,
		messages: [
			{
				role: "system",
				content: buildFilterSystemPrompt("recruiting"),
			},
			{ role: "user", content: `Brief:\n${brief}` },
		],
		output: Output.object({
			name: "RecruitingFilters",
			schema: inferredFiltersSchema,
		}),
	});
	return normalizeInferredFilters(output as InferredFilters);
}
