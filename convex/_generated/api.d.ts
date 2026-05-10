/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as index from "../index.js";
import type * as leads from "../leads.js";
import type * as scheduleCall from "../scheduleCall.js";
import type * as scrapeJob from "../scrapeJob.js";
import type * as search from "../search.js";
import type * as searchTypes from "../searchTypes.js";
import type * as testBc from "../testBc.js";
import type * as wrappers_ai_briefs from "../wrappers/ai/briefs.js";
import type * as wrappers_ai_classifyCandidates from "../wrappers/ai/classifyCandidates.js";
import type * as wrappers_ai_classifyLeads from "../wrappers/ai/classifyLeads.js";
import type * as wrappers_ai_contactInfo from "../wrappers/ai/contactInfo.js";
import type * as wrappers_ai_index from "../wrappers/ai/index.js";
import type * as wrappers_ai_leadFilters from "../wrappers/ai/leadFilters.js";
import type * as wrappers_ai_model from "../wrappers/ai/model.js";
import type * as wrappers_ai_prompts from "../wrappers/ai/prompts.js";
import type * as wrappers_ai_recruitingFilters from "../wrappers/ai/recruitingFilters.js";
import type * as wrappers_ai_schemas from "../wrappers/ai/schemas.js";
import type * as wrappers_ai_score from "../wrappers/ai/score.js";
import type * as wrappers_apollo from "../wrappers/apollo.js";
import type * as wrappers_bc from "../wrappers/bc.js";
import type * as wrappers_enums from "../wrappers/enums.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  index: typeof index;
  leads: typeof leads;
  scheduleCall: typeof scheduleCall;
  scrapeJob: typeof scrapeJob;
  search: typeof search;
  searchTypes: typeof searchTypes;
  testBc: typeof testBc;
  "wrappers/ai/briefs": typeof wrappers_ai_briefs;
  "wrappers/ai/classifyCandidates": typeof wrappers_ai_classifyCandidates;
  "wrappers/ai/classifyLeads": typeof wrappers_ai_classifyLeads;
  "wrappers/ai/contactInfo": typeof wrappers_ai_contactInfo;
  "wrappers/ai/index": typeof wrappers_ai_index;
  "wrappers/ai/leadFilters": typeof wrappers_ai_leadFilters;
  "wrappers/ai/model": typeof wrappers_ai_model;
  "wrappers/ai/prompts": typeof wrappers_ai_prompts;
  "wrappers/ai/recruitingFilters": typeof wrappers_ai_recruitingFilters;
  "wrappers/ai/schemas": typeof wrappers_ai_schemas;
  "wrappers/ai/score": typeof wrappers_ai_score;
  "wrappers/apollo": typeof wrappers_apollo;
  "wrappers/bc": typeof wrappers_bc;
  "wrappers/enums": typeof wrappers_enums;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
