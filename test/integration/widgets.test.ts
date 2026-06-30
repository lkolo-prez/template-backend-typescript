import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp } from "../helpers.js";

describe("widgets CRUD", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a widget and returns 201 with a location header", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/widgets",
      payload: { name: "alpha", color: "red", quantity: 3 },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({ name: "alpha", color: "red", quantity: 3 });
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers.location).toBe(`/v1/widgets/${body.id}`);
  });

  it("rejects invalid input with a Problem Details 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/widgets",
      payload: { name: "", color: "purple" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.json().title).toBe("Request Validation Failed");
  });

  it("returns 409 on duplicate name", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/widgets",
      payload: { name: "dup", color: "blue" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/widgets",
      payload: { name: "dup", color: "green" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().title).toBe("Conflict");
  });

  it("fetches, lists, updates and deletes a widget", async () => {
    const created = await app
      .inject({
        method: "POST",
        url: "/v1/widgets",
        payload: { name: "lifecycle", color: "green", quantity: 1 },
      })
      .then((r) => r.json());

    const got = await app.inject({
      method: "GET",
      url: `/v1/widgets/${created.id}`,
    });
    expect(got.statusCode).toBe(200);
    expect(got.json().name).toBe("lifecycle");

    const list = await app.inject({
      method: "GET",
      url: "/v1/widgets?color=green&limit=10",
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().items.length).toBeGreaterThanOrEqual(1);

    const patched = await app.inject({
      method: "PATCH",
      url: `/v1/widgets/${created.id}`,
      payload: { quantity: 99 },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().quantity).toBe(99);

    const deleted = await app.inject({
      method: "DELETE",
      url: `/v1/widgets/${created.id}`,
    });
    expect(deleted.statusCode).toBe(204);

    const missing = await app.inject({
      method: "GET",
      url: `/v1/widgets/${created.id}`,
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().title).toBe("Not Found");
  });

  it("returns 404 for an unknown route", async () => {
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
    expect(res.json().status).toBe(404);
  });

  it("serves an OpenAPI 3.1 document", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    expect(res.statusCode).toBe(200);
    expect(res.json().openapi).toBe("3.1.0");
  });
});
