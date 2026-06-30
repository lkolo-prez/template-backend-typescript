// IMPORTANT: telemetry must be initialised before any instrumented library is
// imported, so we load config first, then dynamically import telemetry + app
// inside main(). Only `config` is imported eagerly (it has no instrumentation).
import { config } from "./config.js";

/**
 * Container HEALTHCHECK entrypoint. `docker ... HEALTHCHECK CMD ["server.js",
 * "--healthcheck"]` runs the same binary in a short-lived mode that pings the
 * liveness probe and exits 0/1. This avoids shipping curl/wget into distroless.
 */
async function runHealthcheck(): Promise<never> {
  try {
    const res = await fetch(
      `http://127.0.0.1:${config.PORT}/health/live`,
      { signal: AbortSignal.timeout(2_500) },
    );
    process.exit(res.ok ? 0 : 1);
  } catch {
    process.exit(1);
  }
}

const isHealthcheck = process.argv.includes("--healthcheck");

async function main(): Promise<void> {
  // Telemetry must initialise before instrumented libraries are imported.
  const { startTelemetry } = await import("./telemetry.js");
  const telemetry = startTelemetry(config);

  const { buildApp } = await import("./app.js");
  const app = await buildApp({ config });

  // Graceful shutdown: stop accepting connections, drain, flush telemetry.
  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, "shutdown signal received, draining...");

    const timer = setTimeout(() => {
      app.log.error("graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, config.SHUTDOWN_TIMEOUT_MS);
    timer.unref();

    try {
      await app.close();
      await telemetry.shutdown();
      clearTimeout(timer);
      app.log.info("shutdown complete");
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    app.log.fatal({ err: reason }, "unhandled promise rejection");
    void shutdown("SIGTERM");
  });

  try {
    await app.listen({ host: config.HOST, port: config.PORT });
  } catch (err) {
    app.log.fatal({ err }, "failed to start server");
    await telemetry.shutdown();
    process.exit(1);
  }
}

if (isHealthcheck) {
  void runHealthcheck();
} else {
  void main();
}
