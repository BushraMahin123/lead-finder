import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const supabaseDir = join(rootDir, "supabase");

function loadEnvFile() {
  const envPath = join(rootDir, ".env");
  let content;

  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    return;
  }

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.SUPABASE_DB_URL) {
    return process.env.SUPABASE_DB_URL;
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!password || !supabaseUrl) {
    return null;
  }

  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
}

function resolveSqlFiles(targetArg) {
  if (targetArg) {
    const filePath = resolve(process.cwd(), targetArg);
    return [filePath];
  }

  return readdirSync(supabaseDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => join(supabaseDir, name));
}

async function runMigration(filePath, sql) {
  const db = postgres(getDatabaseUrl(), {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
  });

  try {
    await db.unsafe(sql);
    console.log(`✓ Applied ${filePath}`);
  } finally {
    await db.end({ timeout: 5 });
  }
}

async function main() {
  loadEnvFile();

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.error(
      [
        "Missing database connection.",
        "",
        "Add one of these to your .env file:",
        "  DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres",
        "  SUPABASE_DB_PASSWORD=[your database password]",
        "",
        "Find the password in Supabase Dashboard → Project Settings → Database.",
      ].join("\n"),
    );
    process.exit(1);
  }

  const targetArg = process.argv[2];
  const files = resolveSqlFiles(targetArg);

  if (files.length === 0) {
    console.error("No SQL files found to run.");
    process.exit(1);
  }

  console.log(`Running ${files.length} migration file(s)…\n`);

  for (const filePath of files) {
    const sql = readFileSync(filePath, "utf8");
    await runMigration(filePath, sql);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error("Migration failed:", error.message ?? error);
  process.exit(1);
});
