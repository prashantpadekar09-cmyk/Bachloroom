import { Pool } from "pg";

let supabasePool: Pool | null = null;

export function hasSupabaseDbConfig() {
  const connectionString = (process.env.SUPABASE_DB_URL || process.env.DATABASE_URL)?.trim();
  return Boolean(connectionString);
}

export function getSupabasePool() {
  const connectionString = (process.env.SUPABASE_DB_URL || process.env.DATABASE_URL)?.trim();
  if (!connectionString) {
    throw new Error("Missing SUPABASE_DB_URL (or DATABASE_URL) for Supabase Postgres");
  }

  if (supabasePool) {
    return supabasePool;
  }

  const sslEnabled = (process.env.SUPABASE_DB_SSL ?? "true").toLowerCase() !== "false";
  supabasePool = new Pool({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  });

  return supabasePool;
}

export async function closeSupabasePool() {
  if (!supabasePool) return;
  const pool = supabasePool;
  supabasePool = null;
  await pool.end();
}
