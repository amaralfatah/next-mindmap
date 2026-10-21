import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, maps } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { migrateMap, type MindMap } from "@/lib/model";
import { readMapBody } from "@/lib/server/read-map";

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
    const read = await readMapBody(request);
    if ("error" in read) return read.error;
    const body = read.body as MindMap | null;

    if (!body || typeof body !== "object" || !body.nodes) {
      return NextResponse.json({ error: "Invalid map payload" }, { status: 400 });
    }

    const validated = migrateMap({ ...body, id });
    const fields = {
      title: validated.title,
      rootId: validated.rootId,
      nodes: validated.nodes,
      relations: validated.relations ?? null,
      updatedAt: validated.updatedAt,
      schemaVersion: validated.schemaVersion,
    };

    // Conditional save: only write over the copy the client last saw, so edits made in another
    // tab or device are never silently overwritten, and a deleted map is not brought back.
    const baseHeader = request.headers.get("x-base-updated-at");
    if (baseHeader !== null) {
      const base = Number(baseHeader);
      if (!Number.isFinite(base)) {
        return NextResponse.json({ error: "Invalid base version" }, { status: 400 });
      }
      const updated = await db
        .update(maps)
        .set(fields)
        .where(and(eq(maps.id, id), eq(maps.userId, session.user.id), eq(maps.updatedAt, base)))
        .returning({ id: maps.id });
      if (updated.length) return NextResponse.json({ success: true, map: validated });

      const [current] = await db
        .select({ updatedAt: maps.updatedAt })
        .from(maps)
        .where(and(eq(maps.id, id), eq(maps.userId, session.user.id)))
        .limit(1);
      return current
        ? NextResponse.json({ error: "Map was changed elsewhere", updatedAt: current.updatedAt }, { status: 409 })
        : NextResponse.json({ error: "Map was deleted" }, { status: 410 });
    }

    const [existing] = await db
      .select({ userId: maps.userId })
      .from(maps)
      .where(eq(maps.id, id))
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
        createdAt: validated.createdAt,
        ...fields,
      })
      .onConflictDoUpdate({
        target: maps.id,
        set: fields,
        where: eq(maps.userId, session.user.id),
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
