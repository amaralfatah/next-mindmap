import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorRoute } from "@/components/editor/editor";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  // The map id lives in the query string (?id=…): maps exist only in the browser, so there is
  // nothing to pre-render per map in a static export.
  return (
    <Suspense
      fallback={
        <div
          className="dot-paper fixed inset-0 flex flex-col items-center justify-center gap-3 bg-background"
          role="status"
          aria-busy
        >
          <span className="inline-block size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading map…</p>
        </div>
      }
    >
      <EditorRoute />
    </Suspense>
  );
}
