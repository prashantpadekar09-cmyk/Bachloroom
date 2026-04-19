import "dotenv/config";
import express from "express";
import compression from "compression";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { setupDb } from "./database/setup.js";
import { initSupabaseMirror, isSupabaseMirrorEnabled, scheduleSupabaseSync } from "./database/supabaseMirror.js";

// Backend routes
import authRoutes      from "./backend/routes/auth.js";
import roomRoutes      from "./backend/routes/rooms.js";
import chatRoutes      from "./backend/routes/chat.js";
import serviceRoutes   from "./backend/routes/services.js";
import usersRoutes     from "./backend/routes/users.js";
import adminRoutes     from "./backend/routes/admin.js";
import reviewRoutes    from "./backend/routes/reviews.js";
import savedRoomRoutes from "./backend/routes/saved_rooms.js";
import paymentRoutes   from "./backend/routes/payments.js";
import supportRoutes   from "./backend/routes/support.js";
import referralRoutes  from "./backend/routes/referrals.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

async function startServer() {
  // ─── Database (synchronous, must be first) ───────────────────────────────
  setupDb();

  // ─── Express app ─────────────────────────────────────────────────────────
  const app  = express();
  const PORT = Number.isFinite(Number(process.env.PORT)) && Number(process.env.PORT) > 0
    ? Number(process.env.PORT)
    : 3000;

  app.use(compression());
  app.use(express.json({ limit: "50mb" }));

  // ─── Supabase mirror (non-blocking, runs after server starts accepting) ──
  initSupabaseMirror()
    .then(({ enabled }) => {
      if (enabled) console.log("[supabase] Mirror enabled");
    })
    .catch((err) => console.warn("[supabase] Mirror init failed (local SQLite still active):", err?.message));

  // Auto-sync on mutating API calls
  app.use((req, res, next) => {
    if (isSupabaseMirrorEnabled() && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      res.on("finish", () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          scheduleSupabaseSync(`${req.method} ${req.path}`);
        }
      });
    }
    next();
  });

  // ─── API Routes ──────────────────────────────────────────────────────────
  app.use("/api/auth",        authRoutes);
  app.use("/api/rooms",       roomRoutes);
  app.use("/api/chat",        chatRoutes);
  app.use("/api/services",    serviceRoutes);
  app.use("/api/users",       usersRoutes);
  app.use("/api/admin",       adminRoutes);
  app.use("/api/reviews",     reviewRoutes);
  app.use("/api/saved-rooms", savedRoomRoutes);
  app.use("/api/payments",    paymentRoutes);
  app.use("/api/support",     supportRoutes);
  app.use("/api/referrals",   referralRoutes);

  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", persistence: isSupabaseMirrorEnabled() ? "supabase-mirror" : "sqlite-local" })
  );

  // Catch-all for unknown API routes — prevents HTML fallback for API clients
  app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }));

  // ─── Frontend ─────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => res.sendFile(path.resolve(__dirname, "dist/index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
