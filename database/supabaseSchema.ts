import { readFileSync } from "node:fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function splitSqlStatements(input: string) {
  const withoutComments = input.replace(/^\s*--.*$/gm, "").trim();
  return withoutComments
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export const supabaseSchemaSql = readFileSync(path.join(__dirname, "supabaseSchema.sql"), "utf8");
export const supabaseSchemaStatements = splitSqlStatements(supabaseSchemaSql);

export const supabaseTableOrder = [
  "users",
  "rooms",
  "reviews",
  "messages",
  "services",
  "saved_rooms",
  "manual_credit_payments",
  "support_queries",
  "support_query_messages",
  "referral_transactions",
  "referral_withdrawals",
  "room_unlocks",
  "credit_transactions",
] as const;
