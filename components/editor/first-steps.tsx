"use client";

import { useSyncExternalStore } from "react";
import { Kbd } from "@/components/ui/kbd";
import { useMap } from "@/lib/editor/store";
import { useT } from "@/components/i18n-provider";
import { nodeCount } from "@/lib/model";

const coarse = "(pointer: coarse)";

function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = matchMedia(coarse);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => matchMedia(coarse).matches,
    () => false,
  );
}

/**
 * The one thing a new map needs: how to add the next idea. Shown while the map is just its
 * root, gone as soon as the first branch exists.
 */
export function FirstSteps() {
  const t = useT();
  const map = useMap();
  const touch = useCoarsePointer();
  if (!map || nodeCount(map) > 1) return null;

  return (
    <div
      role="note"
      className="rise pointer-events-none absolute inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 flex justify-center sm:bottom-24"
    >
      <p className="max-w-md rounded-xl bg-foreground px-3.5 py-2.5 text-center text-sm text-pretty text-background shadow-md">
        {touch ? (
          t.editor.hintTouch
        ) : (
          <>
            {t.editor.hintKeys.before} <Kbd className="mx-0.5 bg-background/20 font-mono text-background">Tab</Kbd>{" "}
            {t.editor.hintKeys.child} <Kbd className="mx-0.5 bg-background/20 font-mono text-background">Enter</Kbd>{" "}
            {t.editor.hintKeys.sibling}
          </>
        )}
      </p>
    </div>
  );
}
