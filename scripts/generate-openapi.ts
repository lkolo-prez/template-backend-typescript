import { writeFile } from "node:fs/promises";
import { loadConfig } from "../src/config.js";
import { buildApp } from "../src/app.js";

/**
 * Emits the OpenAPI 3.1 document to `openapi.json` without starting the server.
 * Run via `pnpm openapi`. Commit the artifact (or generate it in CI) so API
 * consumers and contract tests have a stable, reviewable spec.
 */
async function main(): Promise<void> {
  const config = loadConfig({ ...process.env, NODE_ENV: "production" });
  const app = await buildApp({ config });
  await app.ready();
  const document = app.swagger();
  await writeFile("openapi.json", `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  // eslint-disable-next-line no-console
  console.log("Wrote openapi.json");
}

void main();
