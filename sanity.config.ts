import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemaTypes";

export const sanityStudioConfig = defineConfig({
  name: "drivwon",
  title: "Drivwon Content Studio",
  projectId: "v6luawxh",
  dataset: "production",
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});

export default sanityStudioConfig;
