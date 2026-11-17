import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Run: node --env-file=.env scripts/dev-postgres.mjs");
  process.exit(1);
}

const url = new URL(databaseUrl);
const databaseDir = path.join(apiRoot, ".pgdata");
const user = decodeURIComponent(url.username);
const password = decodeURIComponent(url.password);
const database = url.pathname.replace(/^\//, "");
const port = Number(url.port || 5432);

const pg = new EmbeddedPostgres({
  databaseDir,
  port,
  user,
  password,
  authMethod: "scram-sha-256",
  persistent: true,
  // Windows defaults to the system codepage; the catalogue stores ₹ and other
  // non-ASCII text, so the cluster must be UTF-8 from the first initdb.
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  autoRehydrateSymlinks: true,
  onLog: (message) => {
    const line = String(message).trim();
    if (line && !line.startsWith("LOG:  database system is ready")) {
      console.log(`[postgres] ${line}`);
    }
  },
  onError: (message) => {
    const line = String(message).trim();
    if (line) console.error(`[postgres] ${line}`);
  },
});

if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
  console.log(`[postgres] initialising cluster in ${databaseDir}`);
  await pg.initialise();
}

await pg.start();
console.log(`[postgres] listening on ${url.hostname}:${port} as ${user}`);

try {
  await pg.createDatabase(database);
  console.log(`[postgres] created database "${database}"`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/already exists/i.test(message)) throw error;
  console.log(`[postgres] database "${database}" already exists`);
}

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`[postgres] received ${signal}, stopping`);
  await pg.stop().catch(() => {});
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
console.log("[postgres] ready — press Ctrl+C to stop");
