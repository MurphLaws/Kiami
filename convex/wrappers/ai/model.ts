// Centralized model handles for every LLM call in the codebase.
// Swapping providers is a one-line change here.
//
// Back on @ai-sdk/openai authed by OPENAI_API_KEY — the previous
// Gemini route hit the free-tier daily cap (20 requests/day) mid-demo
// and the user just provided a fresh OpenAI project key.

import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// gpt-4.1-mini across the board — structured-outputs-capable, fast,
// and a better-than-nano tier per the user's earlier ask.
export const MODEL_IDS = {
	filters: openai("gpt-4.1-mini"),
	briefs: openai("gpt-4.1-mini"),
	classify: openai("gpt-4.1-mini"),
	contactInfo: openai("gpt-4.1-mini"),
} as const;
