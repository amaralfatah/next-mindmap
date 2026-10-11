import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, maps } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { migrateMap, type MindMap } from "@/lib/model";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * Handle loading a single mind map by ID for the authenticated user from PostgreSQL.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const [record] = await db
      .select()
      .from(maps)
      .where(and(eq(maps.id, id), eq(maps.userId, session.user.id)))
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    const validated = migrateMap({
      id: record.id,
      title: record.title,
      rootId: record.rootId,
      nodes: record.nodes,
      relations: record.relations,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      schemaVersion: record.schemaVersion,
    });

    return NextResponse.json({ map: validated });
  } catch (error) {
    console.error("Failed to load map from database:", error);
    return NextResponse.json(
      { error: "Failed to load map from database" },
      { status: 500 }
    );
  }
}

/**
 * Handle updating or saving a single mind map by ID for the authenticated user in PostgreSQL.
 */
export async function PUT(request: Request, context: RouteParams) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as MindMap;

    if (!body || !body.nodes) {
      return NextResponse.json({ error: "Invalid map payload" }, { status: 400 });
    }

    const payload = { ...body, id };
    const validated = migrateMap(payload);

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
      });

    return NextResponse.json({ success: true, map: validated });
  } catch (error) {
    console.error("Failed to update map in database:", error);
    return NextResponse.json(
      { error: "Failed to update map in database" },
      { status: 500 }
    );
  }
}

/**
 * Handle deleting a single mind map by ID for the authenticated user from PostgreSQL.
 */
export async function DELETE(_request: Request, context: RouteParams) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    await db
      .delete(maps)
      .where(and(eq(maps.id, id), eq(maps.userId, session.user.id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete map from database:", error);
    return NextResponse.json(
      { error: "Failed to delete map from database" },
      { status: 500 }
    );
  }
}
