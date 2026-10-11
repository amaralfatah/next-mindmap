"use client";

import { useReactFlow, useStore } from "@xyflow/react";
import { LocateFixedIcon, MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";
import { IconButton } from "@/components/icon-button";
import { useEditor } from "@/lib/editor/store";
import { t } from "@/lib/i18n";

export function ZoomControls() {
  const flow = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const requestFocus = useEditor((s) => s.requestFocus);

  const zoomIn = () => {
    const current = flow.getZoom();
    const next = Math.min(2.5, current * 1.35);
    flow.zoomTo(next, { duration: 100 });
  };

  const zoomOut = () => {
    const current = flow.getZoom();
    const next = Math.max(0.1, current / 1.35);
    flow.zoomTo(next, { duration: 100 });
  };

  return (
    <div className="pointer-events-auto absolute right-3 bottom-4 z-20 hidden flex-col items-center gap-0.5 rounded-xl border bg-background/95 p-1 shadow-sm md:flex">
      <IconButton label={t.editor.zoomIn} keys={["Ctrl", "+"]} side="left" size="icon-sm" onClick={zoomIn}>
        <PlusIcon />
      </IconButton>
      <button
        type="button"
        onClick={() => flow.zoomTo(1, { duration: 100 })}
        className="w-8 rounded-md py-0.5 text-center font-mono text-[10px] text-muted-foreground tabular-nums hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
        aria-label={t.editor.zoomReset}
      >
        {Math.round(zoom * 100)}%
      </button>
      <IconButton label={t.editor.zoomOut} keys={["Ctrl", "−"]} side="left" size="icon-sm" onClick={zoomOut}>
        <MinusIcon />
      </IconButton>
      <span aria-hidden className="my-0.5 h-px w-5 bg-border" />
      <IconButton label={t.editor.fit} keys={["Ctrl", "0"]} side="left" size="icon-sm" onClick={() => flow.fitView({ padding: 0.2, duration: 300, maxZoom: 1.2 })}>
        <MaximizeIcon />
      </IconButton>
      <IconButton
        label={t.editor.focus}
        side="left"
        size="icon-sm"
        onClick={() => {
          const s = useEditor.getState();
          const node = flow.getNode(s.selectedId);
          if (node) {
            void flow.setCenter(node.position.x + (node.width ?? 0) / 2, node.position.y + (node.height ?? 0) / 2, {
              zoom: flow.getZoom(),
              duration: 240,
            });
          } else requestFocus();
        }}
      >
        <LocateFixedIcon />
      </IconButton>
    </div>
  );
}
