import { defineSchema } from "convex/server";
import { z } from "zod";

import { zodTable } from ".";

export const leads = zodTable("leads", () => ({
	name: z.string(),
	email: z.string(),
	phoneNumber: z.string(),
	company: z.object({
		name: z.string(),
		industry: z.string(),
	}),
	classification: z
		.object({
			category: z.enum(["hot", "warm", "cold"]),
			confidence: z.number(),
			reasoning: z.string(),
		})
		.optional(),
	contactStatus: z
		.enum(["pending", "contacted", "failed"])
		.optional(),
	lastContactedAt: z.number().optional(),
}));

export default defineSchema({
	leads: leads
		.table()
		.searchIndex("by_name", { searchField: "name" })
		.searchIndex("by_email", { searchField: "email" })
		.searchIndex("by_phoneNumber", { searchField: "phoneNumber" }),
});
