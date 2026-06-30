import { randomUUID } from "node:crypto";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Correlates every request with a stable id. We honour an inbound
 * `x-request-id` (for distributed tracing across services) but only if it looks
 * sane, otherwise we mint a fresh UUID. The id is echoed back on the response
 * so callers and log aggregators can stitch the request together.
 */
const requestIdPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const inbound = request.headers[REQUEST_ID_HEADER];
    const candidate = Array.isArray(inbound) ? inbound[0] : inbound;
    const id =
      candidate && /^[\w.-]{1,128}$/.test(candidate) ? candidate : randomUUID();

    // Fastify request.id is read-only after creation; expose ours explicitly.
    reply.header(REQUEST_ID_HEADER, id);
    request.requestId = id;
  });
};

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
  }
}

export default fp(requestIdPlugin, { name: "request-id" });
