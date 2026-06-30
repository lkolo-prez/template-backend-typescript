import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";

describe("loadConfig", () => {
  it("applies sane defaults for an empty environment", () => {
    const config = loadConfig({});
    expect(config.PORT).toBe(3000);
    expect(config.HOST).toBe("0.0.0.0");
    expect(config.LOG_LEVEL).toBe("info");
    expect(config.NODE_ENV).toBe("development");
    expect(config.OTEL_ENABLED).toBe(false);
  });

  it("coerces and validates numeric ports", () => {
    const config = loadConfig({ PORT: "8080" });
    expect(config.PORT).toBe(8080);
  });

  it("rejects an out-of-range port", () => {
    expect(() => loadConfig({ PORT: "70000" })).toThrowError(
      /Invalid environment configuration/,
    );
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => loadConfig({ NODE_ENV: "staging" })).toThrowError(
      /NODE_ENV/,
    );
  });

  it("transforms boolean-ish flags", () => {
    expect(loadConfig({ LOG_PRETTY: "true" }).LOG_PRETTY).toBe(true);
    expect(loadConfig({ LOG_PRETTY: "false" }).LOG_PRETTY).toBe(false);
  });

  it("returns a frozen object", () => {
    const config = loadConfig({});
    expect(Object.isFrozen(config)).toBe(true);
  });
});
