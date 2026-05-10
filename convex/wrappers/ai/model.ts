// Centralized model handles for every LLM call in the codebase.
// Swapping providers is a one-line change here.
//
// We use the @ai-sdk/openai provider directly (authed by OPENAI_API_KEY
// in the Convex env) instead of the Vercel AI Gateway, because the
// hackathon prod deployment ships an OpenAI key but no gateway key and
// the gateway rejects raw OpenAI keys with `Unauthenticated`.

import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
	// `apiKey` is read at call time from this env var; we pass it
	// explicitly so the provider doesn't try to fall through to the
	// gateway when the var is named non-standardly.
	apiKey: process.env.OPENAI_API_KEY,
});

// gpt-4.1 family — structured-outputs-capable, widely available, and
// already paid for via the project's OpenAI API key. We previously used
// "gpt-5.4-*" gateway aliases but the prod deployment doesn't have a
// gateway key, so we'd lose the run on every search.
//
// Everything runs on gpt-4.1-mini. Nano is fast but visibly worse at
// classification + contact synthesis quality, and the user explicitly
// asked for a better model than nano.
export const MODEL_IDS = {
	filters: openai("gpt-4.1-mini"),
	briefs: openai("gpt-4.1-mini"),
	classify: openai("gpt-4.1-mini"),
	contactInfo: openai("gpt-4.1-mini"),
} as const;
