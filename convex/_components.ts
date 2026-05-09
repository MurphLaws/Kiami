import { RateLimiter } from "@convex-dev/rate-limiter";
import { Resend } from "@convex-dev/resend";
import { Workpool } from "@convex-dev/workpool";
import { WorkflowManager } from "@convex-dev/workflow";

import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter);
export const resend = new Resend(components.resend);
export const workflow = new WorkflowManager(components.workflow, {
	workpoolOptions: {
		maxParallelism: 10,
	},
});
export const workpool = new Workpool(components.workpool, {
	maxParallelism: 10,
});

/**
 *
 */
