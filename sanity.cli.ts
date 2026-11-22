import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: { projectId: process.env.SANITY_STUDIO_PROJECT_ID || "v6luawxh", dataset: process.env.SANITY_STUDIO_DATASET || "production" },
  studioHost: "drivwon",
  // Deployed Studio app (https://drivwon.sanity.studio). Stops "sanity deploy" asking for the app ID.
  deployment: { appId: "ex70thzxwz9rp1m3urhnbrhn" },
  // The website's Tailwind PostCSS setup must not run inside the Studio build.
  vite: (config) => ({ ...config, css: { ...config.css, postcss: { plugins: [] } } }),
});
