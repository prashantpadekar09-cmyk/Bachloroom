import "dotenv/config";
import { hasSupabaseDbConfig, getSupabasePool } from "./supabase.js";
import { pushLocalToSupabase } from "./supabaseMirror.js";

async function main() {
  if (!hasSupabaseDbConfig()) {
    console.error("Missing SUPABASE_DB_URL (or DATABASE_URL).");
    process.exitCode = 1;
    return;
  }

  const args = new Set(process.argv.slice(2));
  const checkOnly = args.has("--check");

  const pool = getSupabasePool();
  await pool.query("SELECT 1");

  if (checkOnly) {
    console.log("[supabase] connection ok");
    return;
  }

  await pushLocalToSupabase();
  console.log("[supabase] migrated local SQLite -> Supabase (replaced rows)");
}

main().catch((error) => {
  console.error("Supabase migrate failed:", error);
  process.exitCode = 1;
});

