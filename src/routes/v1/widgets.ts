import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ConflictError, NotFoundError } from "../../errors.js";

/**
 * Example resource: "Widgets". This demonstrates the full pattern — Zod schemas
 * that double as runtime validation AND OpenAPI components, typed handlers, and
 * Problem Details errors. The store is an in-memory Map purely for the template;
 * replace `WidgetRepository` with a real persistence layer.
 */

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const WidgetColor = z.enum(["red", "green", "blue"]);

const Widget = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(120),
    color: WidgetColor,
    quantity: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .describe("A widget resource.");

const CreateWidget = z.object({
  name: z.string().min(1).max(120),
  color: WidgetColor,
  quantity: z.number().int().nonnegative().default(0),
});

const UpdateWidget = CreateWidget.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "At least one field must be provided." },
);

const WidgetParams = z.object({ id: z.string().uuid() });

const ListQuery = z.object({
  color: WidgetColor.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const WidgetList = z.object({
  items: z.array(Widget),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
});

const Problem = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  requestId: z.string().optional(),
});

type Widget = z.infer<typeof Widget>;

// ---------------------------------------------------------------------------
// In-memory repository (replace with a real datastore)
// ---------------------------------------------------------------------------

class WidgetRepository {
  private readonly store = new Map<string, Widget>();

  list(filter: { color?: Widget["color"]; limit: number; offset: number }) {
    let items = [...this.store.values()];
    if (filter.color) items = items.filter((w) => w.color === filter.color);
    items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return {
      total: items.length,
      items: items.slice(filter.offset, filter.offset + filter.limit),
    };
  }

  get(id: string): Widget | undefined {
    return this.store.get(id);
  }

  create(input: z.infer<typeof CreateWidget>): Widget {
    const exists = [...this.store.values()].some((w) => w.name === input.name);
    if (exists) {
      throw new ConflictError(`A widget named "${input.name}" already exists.`);
    }
    const now = new Date().toISOString();
    const widget: Widget = {
      id: randomUUID(),
      name: input.name,
      color: input.color,
      quantity: input.quantity,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(widget.id, widget);
    return widget;
  }

  update(id: string, patch: z.infer<typeof UpdateWidget>): Widget {
    const current = this.store.get(id);
    if (!current) throw new NotFoundError(`Widget ${id} not found.`);
    const updated: Widget = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.delete(id)) {
      throw new NotFoundError(`Widget ${id} not found.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const widgetRoutes: FastifyPluginAsyncZod = async (app) => {
  const repo = new WidgetRepository();

  app.get(
    "/widgets",
    {
      schema: {
        tags: ["widgets"],
        summary: "List widgets",
        querystring: ListQuery,
        response: { 200: WidgetList },
      },
    },
    async (request) => {
      const { color, limit, offset } = request.query;
      const { items, total } = repo.list({ color, limit, offset });
      return { items, total, limit, offset };
    },
  );

  app.get(
    "/widgets/:id",
    {
      schema: {
        tags: ["widgets"],
        summary: "Get a widget by id",
        params: WidgetParams,
        response: { 200: Widget, 404: Problem },
      },
    },
    async (request) => {
      const widget = repo.get(request.params.id);
      if (!widget) throw new NotFoundError(`Widget ${request.params.id} not found.`);
      return widget;
    },
  );

  app.post(
    "/widgets",
    {
      schema: {
        tags: ["widgets"],
        summary: "Create a widget",
        body: CreateWidget,
        response: { 201: Widget, 400: Problem, 409: Problem },
      },
    },
    async (request, reply) => {
      const widget = repo.create(request.body);
      return reply.status(201).header("location", `/v1/widgets/${widget.id}`).send(widget);
    },
  );

  app.patch(
    "/widgets/:id",
    {
      schema: {
        tags: ["widgets"],
        summary: "Update a widget",
        params: WidgetParams,
        body: UpdateWidget,
        response: { 200: Widget, 400: Problem, 404: Problem },
      },
    },
    async (request) => repo.update(request.params.id, request.body),
  );

  app.delete(
    "/widgets/:id",
    {
      schema: {
        tags: ["widgets"],
        summary: "Delete a widget",
        params: WidgetParams,
        response: { 204: z.null(), 404: Problem },
      },
    },
    async (request, reply) => {
      repo.delete(request.params.id);
      return reply.status(204).send();
    },
  );
};
