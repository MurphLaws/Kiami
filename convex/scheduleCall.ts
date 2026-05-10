"use node";

// Posts a contact to the Dapta scheduling webhook. The webhook fires
// the call immediately on receipt; we just hand it a tier (high/low)
// so it can prioritize accordingly.
//
// All sensitive bits live in env vars on the deployment:
//   - DAPTA_WEBHOOK_URL    → e.g. https://api.dapta.ai/api/<id>/kiami
//   - DAPTA_API_KEY        → x-api-key header value
//   - KIAMI_TEST_PHONE     → phone we send for every test call (+57...)
//   - KIAMI_BRAND_NAME     → the searcher's brand (e.g. "Innovaitors")
//   - KIAMI_OWNER_EMAIL    → fallback owner email

import { v } from "convex/values";

import { action } from "./_generated/server";

function env(name: string, fallback?: string): string {
	const v = process.env[name];
	if (v) return v;
	if (fallback !== undefined) return fallback;
	throw new Error(`${name} is not set`);
}

function deriveEmail(args: {
	full_name: string;
	company_domain?: string;
}): string {
	const slug = args.full_name
		.toLowerCase()
		.replace(/[^a-z0-9 ]/g, "")
		.trim()
		.replace(/\s+/g, ".");
	const domain = (args.company_domain ?? "kiami.test")
		.replace(/^https?:\/\//, "")
		.replace(/^www\./, "")
		.toLowerCase();
	return `${slug || "lead"}@${domain || "kiami.test"}`;
}

export const scheduleCall = action({
	args: {
		full_name: v.string(),
		company: v.optional(v.string()),
		company_domain: v.optional(v.string()),
		flow: v.union(v.literal("recruiting"), v.literal("sales")),
		tier: v.union(v.literal("high"), v.literal("low")),
		// Optional override for the contact's email; defaults to a
		// deterministic synthesized address since BC strips email PII.
		email: v.optional(v.string()),
	},
	returns: v.any(),
	handler: async (_ctx, args) => {
		const url = env("DAPTA_WEBHOOK_URL");
		const apiKey = env("DAPTA_API_KEY");
		const phone = env("KIAMI_TEST_PHONE");
		const brandName = env("KIAMI_BRAND_NAME", "Innovaitors");
		const ownerEmail = env("KIAMI_OWNER_EMAIL", "nicolaslassojr@gmail.com");
		// Test mode: send the same email for every contact so the webhook
		// receiver always knows who to follow up with. The synthesizer is
		// kept as a final fallback if neither KIAMI_TEST_EMAIL nor an
		// explicit override is set.
		const testEmail = process.env.KIAMI_TEST_EMAIL;
		const brandRole =
			args.flow === "sales" ? "asesor comercial" : "reclutador";

		const email = (
			args.email ??
			testEmail ??
			deriveEmail({
				full_name: args.full_name,
				company_domain: args.company_domain,
			})
		).toLowerCase();
		const company = (args.company ?? "N/A").trim() || "N/A";

		const params = new URLSearchParams({
			"x-api-key": apiKey,
			name: args.full_name,
			phone,
			email,
			company,
			flow: args.flow,
			tier: args.tier,
			owner_email: ownerEmail.toLowerCase(),
			brand_name: brandName,
			brand_role: brandRole,
		});

		const target = `${url}?${params.toString()}`;
		const started = Date.now();
		const res = await fetch(target, {
			method: "GET",
			headers: { "x-api-key": apiKey },
		});
		const text = await res.text();
		let body: unknown = text;
		try {
			body = JSON.parse(text);
		} catch {
			// keep as text
		}
		return {
			ok: res.ok,
			status: res.status,
			body,
			ms: Date.now() - started,
			payload: {
				name: args.full_name,
				phone,
				email,
				company,
				flow: args.flow,
				tier: args.tier,
			},
		};
	},
});
