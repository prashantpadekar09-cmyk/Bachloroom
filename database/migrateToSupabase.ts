import "dotenv/config";
import { hasSupabaseDbConfig, getSupabasePool } from "./supabase.js";
import { pushLocalToSupabase } from "./supabaseMirror.js";

async function main() {
  if (!hasSupabaseDbConfig()) {
    console.error("❌ Missing SUPABASE_DB_URL (or DATABASE_URL).");
    process.exitCode = 1;
    return;
  }

  const args = new Set(process.argv.slice(2));
  const checkOnly = args.has("--check");

  console.log("🚀 Starting Supabase Migration...");
  
  try {
    const pool = getSupabasePool();
    await pool.query("SELECT 1");
    console.log("✅ Supabase connection successful.");

    if (checkOnly) {
      console.log("Migration check complete.");
      return;
    }

    console.log("📦 Transferring local data to Supabase...");
    await pushLocalToSupabase();
    console.log("🎉 Migration completed successfully! Local SQLite data has been mirrored to Supabase.");
    console.log("   - Rows replaced in all tables.");
    console.log("   - Schema verified and updated.");
  } catch (error) {
    console.error("❌ Supabase migrate failed:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Supabase migrate failed:", error);
  process.exitCode = 1;
});

