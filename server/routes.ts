import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerAuthRoutes } from "./features/auth";
import { registerWorkspaceRoutes } from "./features/workspace";
import { handleLead } from "./leads";
import { handleSeoRoute } from "./seo/handler";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAuthRoutes(app);
  registerWorkspaceRoutes(app);

  app.get("/dashboard", (_req, res) => res.status(404).end());

  app.use(["/drivwon/der", "/dashboard", "/studio"], (_req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("Cache-Control", "no-store, private");
    next();
  });

  app.post("/api/leads", async (req, res, next) => {
    try {
      const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim();
      const result = await handleLead(req.body, ip);
      res.status(result.status).json(result.json);
    } catch (error) {
      next(error);
    }
  });

  for (const feed of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/rss.xml", "/feed.xml"]) {
    app.get(feed, async (req, res, next) => {
      try {
        const result = await handleSeoRoute(req.originalUrl, async () => "");
        res.status(result.status).set(result.headers).send(result.body);
      } catch (error) {
        next(error);
      }
    });
  }

  return httpServer;
}
