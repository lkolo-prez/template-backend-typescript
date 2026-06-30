import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/server.ts", // process bootstrap, exercised via e2e not unit tests
        "src/telemetry.ts", // thin SDK wiring, requires a live collector
        "src/**/*.d.ts",
      ],
      // Coverage gate — CI fails below these thresholds.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
