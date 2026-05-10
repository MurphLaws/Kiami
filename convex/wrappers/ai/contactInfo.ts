// Fake contact-info generator (demo-only).
//
// Takes a batch of leads and asks a nano LLM to emit a plausible-looking
// email + phone per row. The model picks locale-appropriate country
// codes from the lead's location, name-derived local parts, and the
// company's domain stem with the IANA-reserved .example.com TLD.
//
// We never call BC's enrichment endpoint — these values are purely for
// the editorial fold during the GTM demo.

import { generateText, Output } from "ai";

import type { NormalizedLead } from "../../searchTypes";
import { MODEL_IDS } from "./model";
import { buildContactInfoSystemPrompt } from "./prompts";
import { contactInfosSchema, type ContactInfo } from "./schemas";

export async function generateContactInfo(args: {
	leads: NormalizedLead[];
}): Promise<ContactInfo[]> {
	if (args.leads.length === 0) return [];

	const summary = args.leads.map((l, i) => ({
		i,
		full_name: l.full_name,
		company_name: l.company_name ?? null,
		company_domain: l.company_domain ?? null,
		location: l.location ?? null,
	}));

	const userPrompt = [
		"Leads (return one fake email + phone per index, in the same order):",
		JSON.stringify(summary, null, 2),
	].join("\n");

	const { output } = await generateText({
		model: MODEL_IDS.contactInfo,
		// A little entropy so two leads in the same city don't get the
		// same area-code triplet. Still low enough that the output stays
		// well-formed.
		temperature: 0.4,
		messages: [
			{ role: "system", content: buildContactInfoSystemPrompt() },
			{ role: "user", content: userPrompt },
		],
		output: Output.object({
			name: "ContactInfos",
			schema: contactInfosSchema,
		}),
	});

	const parsed = (output as { contacts: ContactInfo[] }).contacts;
	const byIndex = new Map<number, ContactInfo>();
	for (const c of parsed) byIndex.set(c.i, c);

	return args.leads.map((lead, i) =>
		byIndex.get(i) ?? defaultContactInfo(i, lead),
	);
}

function defaultContactInfo(i: number, lead: NormalizedLead): ContactInfo {
	const local = (lead.full_name || "lead")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ".")
		.replace(/^\.+|\.+$/g, "");
	const domain = (lead.company_domain || "")
		.toLowerCase()
		.replace(/^https?:\/\//, "")
		.replace(/^www\./, "")
		.split("/")[0];
	const stem = domain && /\./.test(domain) ? domain.split(".")[0] : "company";
	return {
		i,
		email: `${local || "lead"}@${stem}.example.com`,
		phone: "+1 555 000 0000",
	};
}
