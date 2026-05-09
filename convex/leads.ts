import { z } from "zod";

import { zQuery } from "./index";

export const list = zQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("leads").take(50);
	},
});

export const search = zQuery({
	args: { term: z.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("leads")
			.withSearchIndex("by_name", (q) => q.search("name", args.term))
			.take(10);
	},
});
