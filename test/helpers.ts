import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

/**
 * Builds an app instance wired for tests: deterministic config, no telemetry
 * export, quiet logs. Callers should `await app.close()` in afterAll/afterEach.
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  const config = loadConfig({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    OTEL_ENABLED: "false",
    RATE_LIMIT_MAX: "1000",
  });
  return buildApp({ config });
}
