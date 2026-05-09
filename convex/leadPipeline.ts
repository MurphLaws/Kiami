import { Output, generateText } from "ai";
import { convexToZod, zodToConvex, zid } from "convex-helpers/server/zod4";
import { z } from "zod";
import { type WorkId, vResult } from "@convex-dev/workpool";
import { vWorkflowId } from "@convex-dev/workflow";

import { workflow, workpool } from "./_components";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { zInternalAction, zInternalMutation, zInternalQuery } from "./index";

const searchCriteriaSchema = z.object({
	industry: z.string().optional(),
	location: z.string().optional(),
	keyword: z.string().optional(),
});

const rawLeadSchema = z.object({
	name: z.string(),
	email: z.string(),
	phoneNumber: z.string(),
	company: z.object({
		name: z.string(),
		industry: z.string(),
	}),
});

const classificationSchema = z.object({
	category: z.enum(["hot", "warm", "cold"]),
	confidence: z.number(),
	reasoning: z.string(),
});

const classifiedLeadSchema = z.object({
	name: z.string(),
	email: z.string(),
	phoneNumber: z.string(),
	company: z.object({ name: z.string(), industry: z.string() }),
	classification: classificationSchema,
});

// Step 1 — mocked external lead search API.
// Throws transiently to exercise the retry policy.
export const searchExternalLeads = zInternalAction({
	args: z.object({ criteria: searchCriteriaSchema }),
	returns: z.array(rawLeadSchema),
	handler: async (_ctx, args) => {
		await new Promise((resolve) => setTimeout(resolve, 200));

		if (Math.random() < 0.15) {
			throw new Error("External lead search API rate-limited");
		}

		const industry = args.criteria.industry ?? "Technology";
		const keyword = args.criteria.keyword ?? "Operations";
		const location = args.criteria.location ?? "Remote";

		return Array.from({ length: 5 }).map((_, i) => ({
			name: `${keyword} Prospect ${i + 1}`,
			email: `prospect${i + 1}@${industry.toLowerCase().replace(/\s+/g, "")}.example`,
			phoneNumber: `+1-555-01${(10 + i).toString()}`,
			company: {
				name: `Acme ${industry} ${i + 1} (${location})`,
				industry,
			},
		}));
	},
});

// Step 2 — discovery + classification via the Vercel AI SDK.
const llmClassificationSchema = z.object({
	category: z.enum(["hot", "warm", "cold"]),
	confidence: z.number().min(0).max(1),
	reasoning: z.string().max(280),
});

export const classifyLead = zInternalAction({
	args: z.object({ lead: rawLeadSchema }),
	returns: classifiedLeadSchema,
	handler: async (_ctx, args) => {
		const { output } = await generateText({
			model: "openai/gpt-5.5",
			output: Output.object({ schema: llmClassificationSchema }),
			prompt: `You are a B2B sales analyst. Classify this prospect's likelihood to convert into a paying customer.

Lead:
- Name: ${args.lead.name}
- Email: ${args.lead.email}
- Phone: ${args.lead.phoneNumber}
- Company: ${args.lead.company.name}
- Industry: ${args.lead.company.industry}

Reply with JSON: { category: "hot" | "warm" | "cold", confidence: 0..1, reasoning: short sentence }.`,
		});

		return { ...args.lead, classification: output };
	},
});

export const persistLead = zInternalMutation({
	args: z.object({ lead: classifiedLeadSchema }),
	returns: zid("leads"),
	handler: async (ctx, args) => {
		return await ctx.db.insert("leads", {
			name: args.lead.name,
			email: args.lead.email,
			phoneNumber: args.lead.phoneNumber,
			company: args.lead.company,
			classification: args.lead.classification,
			contactStatus: "pending",
		});
	},
});

// Step 3 — mocked outbound contact endpoint. Transiently fails to exercise retries.
export const contactClient = zInternalAction({
	args: z.object({ leadId: zid("leads") }),
	returns: z.object({ contacted: z.boolean(), at: z.number() }),
	handler: async (ctx, args) => {
		const lead = await ctx.runQuery(internal.leadPipeline.getLead, {
			leadId: args.leadId,
		});
		if (!lead) {
			throw new Error(`Lead not found: ${args.leadId}`);
		}

		await new Promise((resolve) => setTimeout(resolve, 150));

		if (Math.random() < 0.35) {
			throw new Error(`Outbound dialer transient failure for ${lead.email}`);
		}

		console.log(
			`[contactClient] Reached ${lead.name} <${lead.email}> at ${lead.phoneNumber}`,
		);
		return { contacted: true, at: Date.now() };
	},
});

export const getLead = zInternalQuery({
	args: z.object({ leadId: zid("leads") }),
	returns: z
		.object({
			_id: zid("leads"),
			name: z.string(),
			email: z.string(),
			phoneNumber: z.string(),
			company: z.object({ name: z.string(), industry: z.string() }),
		})
		.nullable(),
	handler: async (ctx, args) => {
		const lead = await ctx.db.get(args.leadId);
		if (!lead) return null;
		return {
			_id: lead._id,
			name: lead.name,
			email: lead.email,
			phoneNumber: lead.phoneNumber,
			company: lead.company,
		};
	},
});

export const markContactResult = zInternalMutation({
	args: z.object({
		leadId: zid("leads"),
		status: z.enum(["contacted", "failed"]),
	}),
	returns: z.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.leadId, {
			contactStatus: args.status,
			lastContactedAt: Date.now(),
		});
		return null;
	},
});

// Workpool onComplete: records the final contact outcome.
// Even after retries are exhausted the lead state is updated so we can audit which leads were not reached.
export const onContactComplete = zInternalMutation({
	args: z.object({
		workId: z.string(),
		context: zid("leads"),
		result: convexToZod(vResult),
	}),
	returns: z.null(),
	handler: async (ctx, args) => {
		const leadId = args.context;
		if (args.result.kind === "success") {
			await ctx.db.patch(leadId, {
				contactStatus: "contacted",
				lastContactedAt: Date.now(),
			});
		} else {
			await ctx.db.patch(leadId, {
				contactStatus: "failed",
				lastContactedAt: Date.now(),
			});
			console.error(
				`[onContactComplete] Lead ${leadId} not reached: ${
					args.result.kind === "failed" ? args.result.error : "canceled"
				}`,
			);
		}
		return null;
	},
});

// Workflow handler: dispatches a contact attempt to the workpool.
// Retries (up to 8) are governed by the workpool itself, ensuring delivery is attempted exhaustively even after the workflow finishes.
export const enqueueContactViaWorkpool = zInternalMutation({
	args: z.object({ leadId: zid("leads") }),
	returns: z.string(),
	handler: async (ctx, args): Promise<string> => {
		const workId: WorkId = await workpool.enqueueAction(
			ctx,
			internal.leadPipeline.contactClient,
			{ leadId: args.leadId },
			{
				name: `contact-lead-${args.leadId}`,
				retry: {
					maxAttempts: 8,
					initialBackoffMs: 2_000,
					base: 2,
				},
				onComplete: internal.leadPipeline.onContactComplete,
				context: args.leadId,
			},
		);
		return workId;
	},
});

// The orchestration workflow.
// Steps: external search → per-lead LLM classification (parallel) → persist → enqueue contact via the workpool.
export const leadPipeline = workflow.define({
	args: { criteria: zodToConvex(searchCriteriaSchema) },
	returns: zodToConvex(
		z.object({
			leadIds: z.array(zid("leads")),
			contactWorkIds: z.array(z.string()),
		}),
	),
	handler: async (
		step,
		args,
	): Promise<{ leadIds: Id<"leads">[]; contactWorkIds: string[] }> => {
		// 1. External search — retry the upstream call up to 4 times.
		const rawLeads = await step.runAction(
			internal.leadPipeline.searchExternalLeads,
			{ criteria: args.criteria },
			{
				name: "search-external-leads",
				retry: { maxAttempts: 4, initialBackoffMs: 500, base: 2 },
			},
		);

		// 2. Classify each lead in parallel; LLM hiccups get retried per-lead.
		const classified = await Promise.all(
			rawLeads.map((lead, i) =>
				step.runAction(
					internal.leadPipeline.classifyLead,
					{ lead },
					{
						name: `classify-lead-${i}`,
						retry: { maxAttempts: 5, initialBackoffMs: 1_000, base: 2 },
					},
				),
			),
		);

		// 3. Persist + dispatch contact attempts onto the workpool.
		const leadIds: Id<"leads">[] = [];
		const contactWorkIds: string[] = [];
		for (let i = 0; i < classified.length; i++) {
			const leadId: Id<"leads"> = await step.runMutation(
				internal.leadPipeline.persistLead,
				{ lead: classified[i] },
				{ name: `persist-lead-${i}` },
			);
			leadIds.push(leadId);

			const workId: string = await step.runMutation(
				internal.leadPipeline.enqueueContactViaWorkpool,
				{ leadId },
				{ name: `enqueue-contact-${i}` },
			);
			contactWorkIds.push(workId);
		}

		return { leadIds, contactWorkIds };
	},
});

// Optional: log workflow completion for observability.
export const onWorkflowComplete = zInternalMutation({
	args: z.object({
		workflowId: convexToZod(vWorkflowId),
		result: convexToZod(vResult),
		context: z.any(),
	}),
	returns: z.null(),
	handler: async (_ctx, args) => {
		if (args.result.kind === "success") {
			console.log(
				`[leadPipeline] workflow ${args.workflowId} succeeded:`,
				args.result.returnValue,
			);
		} else if (args.result.kind === "failed") {
			console.error(
				`[leadPipeline] workflow ${args.workflowId} failed: ${args.result.error}`,
			);
		} else {
			console.warn(`[leadPipeline] workflow ${args.workflowId} canceled`);
		}
		return null;
	},
});
