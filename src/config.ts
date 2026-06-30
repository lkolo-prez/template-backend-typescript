import { z } from "zod";

/**
 * 12-factor configuration: every runtime input comes from the environment and is
 * validated once at startup. Importing a half-validated config is impossible
 * because the module throws before exporting if validation fails.
 */
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // HTTP server
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),

  // Logging
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  LOG_PRETTY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // Service identity (used for OpenTelemetry resource + logs)
  SERVICE_NAME: z.string().default("template-backend-typescript"),
  SERVICE_VERSION: z.string().default("0.0.0-dev"),

  // OpenTelemetry. When the endpoint is unset, telemetry export is disabled.
  OTEL_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),

  // Graceful shutdown budget (ms)
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

  // Body size limit (bytes)
  BODY_LIMIT: z.coerce.number().int().positive().default(1_048_576),
});

export type AppConfig = Readonly<z.infer<typeof EnvSchema>>;

/**
 * Parse and freeze configuration. Throws a readable error and exits non-zero
 * when the environment is invalid — fail fast, never boot misconfigured.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return Object.freeze(parsed.data);
}

export const config: AppConfig = loadConfig();
