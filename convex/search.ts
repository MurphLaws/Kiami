import { convexToZod, zid } from "convex-helpers/server/zod4";
import { type WorkflowId, vWorkflowId } from "@convex-dev/workflow";
import { z } from "zod";

import { workflow } from "./_components";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { zMutation, zQuery } from "./index";

const searchCriteriaSchema = z.object({
	industry: z.string().optional(),
	location: z.string().optional(),
	keyword: z.string().optional(),
});

type LeadPipelineWorkflowResult = {
	leadIds: Id<"leads">[];
	contactWorkIds: string[];
};

export const startLeadSearch = zMutation({
	args: z.object({
		criteria: searchCriteriaSchema,
	}),
	returns: convexToZod(vWorkflowId),
	handler: async (ctx, args): Promise<WorkflowId> => {
		return await workflow.start(
			ctx,
			internal.leadPipeline.leadPipeline,
			{ criteria: args.criteria },
			{
				onComplete: internal.leadPipeline.onWorkflowComplete,
				context: args.criteria,
			},
		);
	},
});

export const getSearchStatus = zQuery({
	args: z.object({ workflowId: convexToZod(vWorkflowId) }),
	returns: z.discriminatedUnion("type", [
		z.object({ type: z.literal("inProgress") }),
		z.object({
			type: z.literal("completed"),
			result: z.object({
				leadIds: z.array(zid("leads")),
				contactWorkIds: z.array(z.string()),
			}),
		}),
		z.object({ type: z.literal("canceled") }),
		z.object({ type: z.literal("failed"), error: z.string() }),
	]),
	handler: async (ctx, args) => {
		const status = await workflow.status(ctx, args.workflowId as WorkflowId);
		if (status.type === "inProgress") return { type: "inProgress" as const };
		if (status.type === "completed") {
			return {
				type: "completed" as const,
				result: status.result as LeadPipelineWorkflowResult,
			};
		}
		if (status.type === "canceled") return { type: "canceled" as const };
		return { type: "failed" as const, error: status.error };
	},
});
