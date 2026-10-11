import { defineConfig } from "drizzle-kit";

if (process.loadEnvFile) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Ignore if already loaded or missing
  }
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
