import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

const HealthResponse = z.object({
  status: z.literal("ok"),
  uptime: z.number().describe("Process uptime in seconds."),
  timestamp: z.string().datetime(),
});

const ReadyResponse = z.object({
  status: z.enum(["ready", "not-ready"]),
  checks: z.record(z.string(), z.enum(["pass", "fail"])),
});

/**
 * Kubernetes-style probes.
 *
 *  - `/health/live`  liveness:  the process is up and the event loop responds.
 *  - `/health/ready` readiness: dependencies (db, queues, ...) are reachable.
 *
 * Liveness must stay cheap and dependency-free so a transient downstream
 * outage never triggers a pod restart loop. Readiness owns dependency checks.
 */
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health/live",
    {
      schema: {
        tags: ["health"],
        summary: "Liveness probe",
        response: { 200: HealthResponse },
      },
    },
    async () => ({
      status: "ok" as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );

  app.get(
    "/health/ready",
    {
      schema: {
        tags: ["health"],
        summary: "Readiness probe",
        response: { 200: ReadyResponse, 503: ReadyResponse },
      },
    },
    async (_request, reply) => {
      // Register real dependency checks here (database ping, cache, etc.).
      const checks: Record<string, "pass" | "fail"> = {
        eventLoop: "pass",
      };
      const ready = Object.values(checks).every((c) => c === "pass");
      return reply.status(ready ? 200 : 503).send({
        status: ready ? ("ready" as const) : ("not-ready" as const),
        checks,
      });
    },
  );
};
