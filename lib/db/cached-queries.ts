import { cache } from "react";
import { getAppConfig } from "@/lib/app-config";

/**
 * Per-request dedupe for hot reads via React `cache()`.
 *
 * Scope rules (deliberately narrow):
 * - Only reads that are actually invoked more than once per server render get
 *   a wrapper here. Today that is `getAppConfig`, which pages call from both
 *   `generateMetadata` and the page body.
 * - Reads used at most once per page (getSections, getFacultyList, …) stay
 *   direct calls — no speculative caching.
 *
 * `cache()` memoizes for one request only, so values can never leak across
 * users or go stale between requests. Note `getAppConfig` additionally keeps
 * its own 30s module-level cache in app-config.ts; this wrapper guarantees
 * dedupe even for concurrent first calls within a single render.
 */
export const getCachedAppConfig = cache(getAppConfig);
