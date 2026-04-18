import { readFileSync } from "node:fs";

function splitSqlStatements(input: string) {
  const withoutComments = input.replace(/^\s*--.*$/gm, "").trim();
  return withoutComments
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export const supabaseSchemaSql = readFileSync(new URL("./supabaseSchema.sql", import.meta.url), "utf8");
export const supabaseSchemaStatements = splitSqlStatements(supabaseSchemaSql);

export const supabaseTableOrder = [
  "users",
  "rooms",
  "reviews",
  "messages",
  "services",
  "saved_rooms",
  "premium_payments",
  "support_queries",
  "support_query_messages",
  "referral_transactions",
  "referral_withdrawals",
] as const;
