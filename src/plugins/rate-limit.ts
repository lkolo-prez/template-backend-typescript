import rateLimit from "@fastify/rate-limit";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import type { AppConfig } from "../config.js";

/**
 * Global rate limiting. The default in-memory store is fine for a single
 * replica; for horizontally-scaled deployments swap in the Redis store
 * (`@fastify/rate-limit` supports a `redis` option) so the budget is shared.
 */
const rateLimitPlugin: FastifyPluginAsync<{ config: AppConfig }> = async (
  app,
  opts,
) => {
  await app.register(rateLimit, {
    max: opts.config.RATE_LIMIT_MAX,
    timeWindow: opts.config.RATE_LIMIT_WINDOW,
    // Health/readiness probes must never be throttled.
    allowList: ["/health/live", "/health/ready"],
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
  });
};

export default fp(rateLimitPlugin, { name: "rate-limit" });
