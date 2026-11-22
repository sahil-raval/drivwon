import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: { projectId: process.env.SANITY_STUDIO_PROJECT_ID || "v6luawxh", dataset: process.env.SANITY_STUDIO_DATASET || "production" },
  studioHost: "drivwon",
  // The website's Tailwind PostCSS setup must not run inside the Studio build.
  vite: (config) => ({ ...config, css: { ...config.css, postcss: { plugins: [] } } }),
});
