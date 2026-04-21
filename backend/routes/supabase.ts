import express from "express";
import { hasSupabaseDbConfig, getSupabasePool } from "../../database/supabase.js";
import { getSupabaseMirrorStatus } from "../../database/supabaseMirror.js";

const router = express.Router();

router.get("/status", async (req, res) => {
  const hasConfig = hasSupabaseDbConfig();
  const mirror = getSupabaseMirrorStatus();

  const shouldCheck = String(req.query.check ?? "") === "1";
  let remote: "ok" | "error" | "skipped" = shouldCheck ? "error" : "skipped";

  if (shouldCheck && hasConfig) {
    try {
      await getSupabasePool().query("SELECT 1");
      remote = "ok";
    } catch {
      remote = "error";
    }
  }

  res.json({
    hasConfig,
    remote,
    mirror,
  });
});

export default router;

