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
import type * as search from "../search.js";
import type * as searchTypes from "../searchTypes.js";
import type * as wrappers_apollo from "../wrappers/apollo.js";
import type * as wrappers_bc from "../wrappers/bc.js";
import type * as wrappers_briefs from "../wrappers/briefs.js";
import type * as wrappers_enums from "../wrappers/enums.js";
import type * as wrappers_openai from "../wrappers/openai.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  index: typeof index;
  leads: typeof leads;
  search: typeof search;
  searchTypes: typeof searchTypes;
  "wrappers/apollo": typeof wrappers_apollo;
  "wrappers/bc": typeof wrappers_bc;
  "wrappers/briefs": typeof wrappers_briefs;
  "wrappers/enums": typeof wrappers_enums;
  "wrappers/openai": typeof wrappers_openai;
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
