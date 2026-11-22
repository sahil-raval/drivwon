/** Loads .env.local first (your private overrides), then .env. Existing shell variables always win. */
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
