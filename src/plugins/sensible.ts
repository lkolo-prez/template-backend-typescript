import sensible from "@fastify/sensible";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

/**
 * @fastify/sensible adds well-known HTTP error helpers (httpErrors.notFound,
 * etc.), `request.is404` and other small utilities used across routes.
 */
const sensiblePlugin: FastifyPluginAsync = async (app) => {
  await app.register(sensible);
};

export default fp(sensiblePlugin, { name: "sensible" });
