// Centralized model IDs for every LLM call in the codebase.
// Swapping providers is a one-line change here.
//
// All IDs are Vercel AI Gateway slugs ("openai/...") resolved at runtime
// via AI_GATEWAY_API_KEY (set with `npx convex env set`).

export const MODEL_IDS = {
	filters: "openai/gpt-5.4-mini",
	briefs: "openai/gpt-5.4-mini",
	classify: "openai/gpt-5.4-nano",
	// Demo-only fake email + phone synthesis — uses the nano tier since
	// the output is short, formulaic, and per-row.
	contactInfo: "openai/gpt-5.4-nano",
} as const;
