import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp } from "../helpers.js";

describe("health routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("liveness returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health/live" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
  });

  it("readiness returns ready with passing checks", async () => {
    const res = await app.inject({ method: "GET", url: "/health/ready" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: "ready",
      checks: { eventLoop: "pass" },
    });
  });

  it("echoes a request id header", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health/live",
      headers: { "x-request-id": "abc-123" },
    });
    expect(res.headers["x-request-id"]).toBe("abc-123");
  });

  it("sets security headers", async () => {
    const res = await app.inject({ method: "GET", url: "/health/live" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["strict-transport-security"]).toContain("max-age=");
  });
});
