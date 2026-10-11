import { pgTable, varchar, text, jsonb, bigint, integer } from "drizzle-orm/pg-core";
import type { MindNode, Relation } from "@/lib/model";

/**
 * Maps table representing mind map documents stored in Neon PostgreSQL.
 */
export const maps = pgTable("maps", {
  id: varchar("id", { length: 128 }).primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  rootId: varchar("root_id", { length: 128 }).notNull(),
  nodes: jsonb("nodes").$type<Record<string, MindNode>>().notNull(),
  relations: jsonb("relations").$type<Relation[]>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  schemaVersion: integer("schema_version").notNull().default(1),
});

export type MapRecord = typeof maps.$inferSelect;
export type NewMapRecord = typeof maps.$inferInsert;
