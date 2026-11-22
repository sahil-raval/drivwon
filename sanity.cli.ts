import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: { projectId: "v6luawxh", dataset: "production" },
  studioHost: "drivwon",
  // The website's Tailwind PostCSS setup must not run inside the Studio build.
  vite: (config) => ({ ...config, css: { ...config.css, postcss: { plugins: [] } } }),
});
