import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, maps } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { migrateMap, type MindMap } from "@/lib/model";

/**
 * Handle listing all mind maps for the authenticated user from PostgreSQL.
 */
export async function GET() {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const records = await db
      .select()
      .from(maps)
      .where(eq(maps.userId, session.user.id))
      .orderBy(desc(maps.updatedAt));

    const validMaps: MindMap[] = [];
    const broken: string[] = [];

    for (const record of records) {
      try {
        validMaps.push(
          migrateMap({
            id: record.id,
            title: record.title,
            rootId: record.rootId,
            nodes: record.nodes,
            relations: record.relations,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            schemaVersion: record.schemaVersion,
          })
        );
      } catch {
        broken.push(record.id);
      }
    }

    return NextResponse.json({ maps: validMaps, broken, user: session.user });
  } catch (error) {
    console.error("Failed to fetch maps from database:", error);
    return NextResponse.json(
      { error: "Failed to fetch maps from database" },
      { status: 500 }
    );
  }
}

/**
 * Handle inserting or updating a mind map in PostgreSQL for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in to save maps" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as MindMap;
    if (!body || !body.id || !body.title || !body.rootId || !body.nodes) {
      return NextResponse.json({ error: "Invalid map payload" }, { status: 400 });
    }

    const validated = migrateMap(body);

    const [existing] = await db
      .select({ userId: maps.userId })
      .from(maps)
      .where(eq(maps.id, validated.id))
      .limit(1);

    if (existing && existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Map belongs to another user" },
        { status: 403 }
      );
    }

    await db
      .insert(maps)
      .values({
        id: validated.id,
        userId: session.user.id,
        title: validated.title,
        rootId: validated.rootId,
        nodes: validated.nodes,
        relations: validated.relations ?? null,
        createdAt: validated.createdAt,
        updatedAt: validated.updatedAt,
        schemaVersion: validated.schemaVersion,
      })
      .onConflictDoUpdate({
        target: maps.id,
        set: {
          title: validated.title,
          rootId: validated.rootId,
          nodes: validated.nodes,
          relations: validated.relations ?? null,
          updatedAt: validated.updatedAt,
          schemaVersion: validated.schemaVersion,
        },
        where: eq(maps.userId, session.user.id),
      });

    return NextResponse.json({ success: true, map: validated });
  } catch (error) {
    console.error("Failed to save map to database:", error);
    return NextResponse.json(
      { error: "Failed to save map into database" },
      { status: 500 }
    );
  }
}
