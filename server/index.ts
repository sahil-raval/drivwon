import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { attachWorkspaceSessions } from "./features/auth";

const app = express();
const httpServer = createServer(app);
attachWorkspaceSessions(app);

/* ─────────────────────────────────────────────── */
/* Extend IncomingMessage to store rawBody         */
/* ─────────────────────────────────────────────── */
declare module "http" {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

/* ─────────────────────────────────────────────── */
/* Middleware                                      */
/* ─────────────────────────────────────────────── */
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use("/api/workspace/files", express.raw({ type: "*/*", limit: "50mb" }));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

/* ─────────────────────────────────────────────── */
/* Logger Utility                                  */
/* ─────────────────────────────────────────────── */
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/* ─────────────────────────────────────────────── */
/* Request Logging                                 */
/* ─────────────────────────────────────────────── */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

/* ─────────────────────────────────────────────── */
/* App Bootstrap                                   */
/* ─────────────────────────────────────────────── */
(async () => {
  await registerRoutes(httpServer, app);

  /* Global Error Handler */
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error("[server] Request failed.", err);
    const message = status >= 500 ? "Something went wrong. Please try again." : (err.message || "Request failed.");
    res.status(status).json({ error: message });
  });

  /* Production / Development setup */
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  /* ───────────────────────────────────────────── */
  /* Start Server (macOS + Node SAFE)               */
  /* ───────────────────────────────────────────── */
  const port = parseInt(process.env.PORT || "5173", 10);

  httpServer.listen(port, () => {
    log(`🚀 Server running on http://localhost:${port}`);
  });
})();
