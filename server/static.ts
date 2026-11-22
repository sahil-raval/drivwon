import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { handleSeoRoute } from "./seo/handler";

/** Production: serve built assets, then render every HTML route with server-side SEO tags and crawler HTML. */
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  const templatePath = path.resolve(__dirname, "template.html");
  if (!fs.existsSync(distPath) || !fs.existsSync(templatePath)) {
    throw new Error(`Could not find the build output in ${path.dirname(distPath)}. Run "npm run build" first.`);
  }
  let template: string | null = null;
  const getTemplate = async () => (template ??= await fs.promises.readFile(templatePath, "utf8"));

  app.use(express.static(distPath, { index: false, maxAge: "1h", setHeaders: (res, file) => { if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); } }));

  app.get("*", async (req, res, next) => {
    try {
      const result = await handleSeoRoute(req.originalUrl, getTemplate);
      res.status(result.status).set(result.headers).send(result.body);
    } catch (error) {
      next(error);
    }
  });
}
