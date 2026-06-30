import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

/**
 * Applies a conservative set of security response headers without pulling in a
 * heavy dependency. These are appropriate for a JSON API (no inline scripts,
 * no embedding). Tune the CSP/permissions if you ever serve HTML beyond /docs.
 */
const securityHeadersPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
    reply.header(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()",
    );
    reply.header(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
    // Remove the framework fingerprint.
    reply.removeHeader("x-powered-by");
    return payload;
  });
};

export default fp(securityHeadersPlugin, { name: "security-headers" });
