import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { setupDb } from "./src/db/setup.js";
import { initTursoMirror, isTursoMirrorEnabled, scheduleTursoSync } from "./src/db/tursoMirror.js";
import authRoutes from "./src/routes/auth.js";
import roomRoutes from "./src/routes/rooms.js";
import bookingRoutes from "./src/routes/bookings.js";
import chatRoutes from "./src/routes/chat.js";
import aiRoutes from "./src/routes/ai.js";
import serviceRoutes from "./src/routes/services.js";
import usersRoutes from "./src/routes/users.js";
import adminRoutes from "./src/routes/admin.js";
import reviewRoutes from "./src/routes/reviews.js";
import savedRoomsRoutes from "./src/routes/saved_rooms.js";
import paymentRoutes from "./src/routes/payments.js";
import supportRoutes from "./src/routes/support.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const parsedPort = Number(process.env.PORT);
  const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

  app.use(express.json({ limit: "50mb" }));

  // Setup database
  setupDb();
  await initTursoMirror();

  app.use((req, res, next) => {
    if (!isTursoMirrorEnabled()) {
      return next();
    }

    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      return next();
    }

    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        scheduleTursoSync(`${req.method} ${req.path}`);
      }
    });

    next();
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/rooms", roomRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/services", serviceRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/saved-rooms", savedRoomsRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/support", supportRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", persistence: isTursoMirrorEnabled() ? "turso-mirror" : "sqlite-local" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
