import { defineSchema } from "convex/server";
import { z } from "zod";

import { zodTable } from ".";

export const candidates = zodTable("candidates", () => ({
	name: z.string(),
	email: z.string(),
	phoneNumber: z.string(),
}));

export default defineSchema({
	candidates: candidates
		.table()
		.searchIndex("by_name", { searchField: "name" })
		.searchIndex("by_email", { searchField: "email" })
		.searchIndex("by_phoneNumber", { searchField: "phoneNumber" }),
});
