// Centralized model handles for every LLM call in the codebase.
// Swapping providers is a one-line change here.
//
// We route through @ai-sdk/google (Gemini), authed by
// GOOGLE_GENERATIVE_AI_API_KEY in the Convex env. Previously we used
// the OpenAI provider but the project's OpenAI key kept hitting its
// quota mid-demo. Gemini has a generous free tier and the same
// structured-outputs surface via the AI SDK.

import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// gemini-2.5-flash — fast, cheap, structured-outputs-capable. We run
// every call on the same tier because the user explicitly asked to
// avoid nano-class quality.
export const MODEL_IDS = {
	filters: google("gemini-2.5-flash"),
	briefs: google("gemini-2.5-flash"),
	classify: google("gemini-2.5-flash"),
	contactInfo: google("gemini-2.5-flash"),
} as const;
