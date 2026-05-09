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
}));

export default defineSchema({
	leads: leads
		.table()
		.searchIndex("by_name", { searchField: "name" })
		.searchIndex("by_email", { searchField: "email" })
		.searchIndex("by_phoneNumber", { searchField: "phoneNumber" }),
});
