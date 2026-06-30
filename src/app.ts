import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import type { AppConfig } from "./config.js";
import { registerErrorHandler } from "./errors.js";
import { createLogger } from "./logger.js";
import requestId from "./middlewares/request-id.js";
import rateLimit from "./plugins/rate-limit.js";
import securityHeaders from "./plugins/security-headers.js";
import sensible from "./plugins/sensible.js";
import { healthRoutes } from "./routes/health.js";
import { widgetRoutes } from "./routes/v1/widgets.js";

export interface BuildAppOptions {
  config: AppConfig;
}

/**
 * Builds and fully configures the Fastify instance WITHOUT listening on a port.
 * Keeping `buildApp` side-effect free (no `.listen`) is what makes integration
 * testing with `app.inject()` fast and deterministic.
 */
export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  const { config } = opts;

  const app = Fastify({
    loggerInstance: createLogger(config),
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: "x-request-id",
    disableRequestLogging: false,
    bodyLimit: config.BODY_LIMIT,
    trustProxy: true,
    ajv: { customOptions: { removeAdditional: "all" } },
  }).withTypeProvider<ZodTypeProvider>();

  // Zod drives both validation and serialization.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandler(app);

  // Cross-cutting plugins (order matters: ids + headers before routes).
  await app.register(requestId);
  await app.register(securityHeaders);
  await app.register(sensible);
  await app.register(rateLimit, { config });

  // OpenAPI 3.1 document derived from the Zod schemas, served at /docs.
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: config.SERVICE_NAME,
        description:
          "Production-grade Fastify microservice template. Schemas are generated from Zod.",
        version: config.SERVICE_VERSION,
      },
      servers: [{ url: "/", description: "current host" }],
      tags: [
        { name: "health", description: "Liveness and readiness probes." },
        { name: "widgets", description: "Example CRUD resource." },
      ],
    },
    transform: ({ schema, url }) => {
      // fastify-type-provider-zod supplies the JSON Schema conversion.
      return { schema, url };
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

  // Routes.
  await app.register(healthRoutes);
  await app.register(widgetRoutes, { prefix: "/v1" });

  return app;
}
