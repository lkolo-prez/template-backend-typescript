import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import type { AppConfig } from "./config.js";

/**
 * OpenTelemetry bootstrap: traces, metrics and logs over OTLP/HTTP.
 *
 * This MUST be started before any instrumented library is imported, which is
 * why `server.ts` imports and calls `startTelemetry()` before importing the
 * Fastify app. When OTEL is disabled or no endpoint is configured, this is a
 * no-op and returns a shutdown function that resolves immediately.
 */
export interface Telemetry {
  shutdown: () => Promise<void>;
}

export function startTelemetry(config: AppConfig): Telemetry {
  if (!config.OTEL_ENABLED || !config.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return { shutdown: async () => {} };
  }

  const endpoint = config.OTEL_EXPORTER_OTLP_ENDPOINT;
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: config.SERVICE_VERSION,
  });

  const loggerProvider = new LoggerProvider({ resource });
  loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(
      new OTLPLogExporter({ url: `${endpoint}/v1/logs` }),
    ),
  );

  const sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
      exportIntervalMillis: 15_000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs instrumentation is noisy and rarely actionable for an HTTP service.
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  return {
    shutdown: async () => {
      await Promise.allSettled([sdk.shutdown(), loggerProvider.shutdown()]);
    },
  };
}
