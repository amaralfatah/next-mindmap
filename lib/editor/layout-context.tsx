"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import { layoutMap, type Layout } from "@/lib/layout";
import { useEditor, useMap } from "./store";
import { useTextWidth } from "./text-width";

const LayoutContext = createContext<Layout | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const map = useMap();
  const editingId = useEditor((s) => s.editingId);
  const draft = useEditor((s) => s.draft);
  const measure = useTextWidth();
  const layout = useMemo(() => {
    if (!map || !measure) return null;
    return layoutMap(map, measure, editingId ? { [editingId]: draft } : {});
  }, [map, measure, editingId, draft]);
  return <LayoutContext value={layout}>{children}</LayoutContext>;
}

export function useLayout(): Layout | null {
  return use(LayoutContext);
}
