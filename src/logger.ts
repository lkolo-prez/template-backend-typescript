import { pino, type Logger, type LoggerOptions } from "pino";
import type { AppConfig } from "./config.js";

/**
 * Structured JSON logging with Pino. In development we optionally pretty-print;
 * in production we emit newline-delimited JSON for log shippers. Sensitive
 * fields are redacted by default so secrets never reach the log pipeline.
 */
export function createLogger(config: AppConfig): Logger {
  const base: LoggerOptions = {
    level: config.LOG_LEVEL,
    base: {
      service: config.SERVICE_NAME,
      version: config.SERVICE_VERSION,
      env: config.NODE_ENV,
    },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['x-api-key']",
        "*.password",
        "*.token",
        "*.secret",
      ],
      censor: "[REDACTED]",
    },
  };

  if (config.LOG_PRETTY && config.NODE_ENV !== "production") {
    return pino({
      ...base,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
    });
  }

  return pino(base);
}
