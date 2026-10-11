import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Get or initialize the Neon HTTP Drizzle database client.
 */
function createDbClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required.");
  }
  const client = neon(connectionString);
  return drizzle(client, { schema });
}

export const db = createDbClient();
export { maps } from "./schema";
export * from "./schema";
