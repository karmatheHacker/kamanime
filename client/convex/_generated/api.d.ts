/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as blocks from "../blocks.js";
import type * as chat from "../chat.js";
import type * as chatRooms from "../chatRooms.js";
import type * as friends from "../friends.js";
import type * as notifications from "../notifications.js";
import type * as preferences from "../preferences.js";
import type * as rooms from "../rooms.js";
import type * as torrents from "../torrents.js";
import type * as users from "../users.js";
import type * as watchProgress from "../watchProgress.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  blocks: typeof blocks;
  chat: typeof chat;
  chatRooms: typeof chatRooms;
  friends: typeof friends;
  notifications: typeof notifications;
  preferences: typeof preferences;
  rooms: typeof rooms;
  torrents: typeof torrents;
  users: typeof users;
  watchProgress: typeof watchProgress;
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
