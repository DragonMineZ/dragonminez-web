// Local dev: embedded Postgres (data in .pgdata) + migrate + seed + astro dev.
import EmbeddedPostgres from "embedded-postgres";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const PORT = 54329;
const DB = "forum";
const pg = new EmbeddedPostgres({
  databaseDir: ".pgdata",
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
  onLog: () => {},
  onError: (e) => console.error("[postgres]", e),
});

if (!existsSync(".pgdata/PG_VERSION")) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase(DB);
} catch {
  // already exists
}

const env = {
  ...process.env,
  DATABASE_URL: `postgresql://postgres:postgres@localhost:${PORT}/${DB}`,
  SESSION_SECRET: process.env.SESSION_SECRET ?? "dev-secret-not-for-production-0123456789",
  DEV_LOGIN: "1",
  // The forum is staff-only unless FORUM_PUBLIC=1; local dev is open. Run with FORUM_PUBLIC=0 to test the lock.
  FORUM_PUBLIC: process.env.FORUM_PUBLIC ?? "1",
  PUBLIC_APP_URL: "http://localhost:4321",
};
const run = (args) => {
  const r = spawnSync("npx", args, { env, stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error(`npx ${args.join(" ")} failed`);
};

let astro;
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (astro && astro.exitCode === null) {
    spawnSync("taskkill", ["/pid", String(astro.pid), "/T", "/F"], { stdio: "ignore" });
  }
  await pg.stop().catch(() => {});
  process.exit(code);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

try {
  run(["prisma", "generate"]);
  run(["prisma", "migrate", "deploy"]);
  run(["prisma", "db", "seed"]);
} catch (e) {
  console.error(e.message);
  await stop(1);
}

astro = spawn("npx", ["astro", "dev"], { env, stdio: "inherit", shell: true });
astro.on("exit", (code) => stop(code ?? 0));
