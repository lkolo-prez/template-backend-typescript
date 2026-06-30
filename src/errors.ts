import type { FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";

/**
 * RFC 9457 "Problem Details" error shape. We expose a stable, machine-readable
 * body for every error response and never leak stack traces to clients.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: unknown;
  requestId?: string;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly type: string;
  readonly title: string;
  readonly expose: boolean;

  constructor(opts: {
    statusCode: number;
    type: string;
    title: string;
    message?: string;
    expose?: boolean;
  }) {
    super(opts.message ?? opts.title);
    this.name = "AppError";
    this.statusCode = opts.statusCode;
    this.type = opts.type;
    this.title = opts.title;
    this.expose = opts.expose ?? true;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super({
      statusCode: 404,
      type: "https://aircloud.com.pl/problems/not-found",
      title: "Not Found",
      message,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message = "The resource already exists.") {
    super({
      statusCode: 409,
      type: "https://aircloud.com.pl/problems/conflict",
      title: "Conflict",
      message,
    });
  }
}

/**
 * Central error handler. Converts Zod validation failures, AppErrors and
 * unexpected exceptions into a consistent Problem Details payload, logging the
 * full error server-side while exposing only safe information to the client.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    if (hasZodFastifySchemaValidationErrors(error)) {
      const body: ProblemDetails = {
        type: "https://aircloud.com.pl/problems/validation",
        title: "Request Validation Failed",
        status: 400,
        detail: "One or more fields failed validation.",
        instance: request.url,
        errors: error.validation,
        requestId,
      };
      request.log.info({ err: error, requestId }, "request validation failed");
      return reply.status(400).type("application/problem+json").send(body);
    }

    if (error instanceof AppError) {
      const body: ProblemDetails = {
        type: error.type,
        title: error.title,
        status: error.statusCode,
        detail: error.expose ? error.message : undefined,
        instance: request.url,
        requestId,
      };
      request.log.warn({ err: error, requestId }, "application error");
      return reply
        .status(error.statusCode)
        .type("application/problem+json")
        .send(body);
    }

    // Fastify's own HTTP errors (e.g. rate limit 429, 404) carry a statusCode.
    const statusCode = error.statusCode ?? 500;
    if (statusCode < 500) {
      const body: ProblemDetails = {
        type: "about:blank",
        title: error.name || "Client Error",
        status: statusCode,
        detail: error.message,
        instance: request.url,
        requestId,
      };
      return reply
        .status(statusCode)
        .type("application/problem+json")
        .send(body);
    }

    request.log.error({ err: error, requestId }, "unhandled server error");
    const body: ProblemDetails = {
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred.",
      instance: request.url,
      requestId,
    };
    return reply.status(500).type("application/problem+json").send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ProblemDetails = {
      type: "https://aircloud.com.pl/problems/not-found",
      title: "Not Found",
      status: 404,
      detail: `Route ${request.method} ${request.url} not found.`,
      instance: request.url,
      requestId: request.id,
    };
    return reply.status(404).type("application/problem+json").send(body);
  });
}
