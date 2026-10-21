import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorRoute } from "@/components/editor/editor";
import { dictionaries } from "@/lib/i18n";
import { requestLocale } from "@/lib/locale-server";

export const metadata: Metadata = { title: "Map" };

export default async function MapPage() {
  const t = dictionaries[await requestLocale()];
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
          <p className="text-sm text-muted-foreground">{t.editor.loadingMap}</p>
        </div>
      }
    >
      <EditorRoute />
    </Suspense>
  );
}
