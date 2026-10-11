"use client";

import type { Edge, EdgeProps } from "@xyflow/react";
import { memo } from "react";
import type { BranchColor } from "@/lib/model";
import { useEditor } from "@/lib/editor/store";
import { t } from "@/lib/i18n";
import { branchVar } from "./mind-node";

export type MindEdgeData = {
  path: string;
  color: BranchColor | null;
  width: number;
  dimmed: boolean;
  /** Set for free-form relations; clicking one removes it (undoable). */
  relationId?: string;
};
export type MindFlowEdge = Edge<MindEdgeData, "mind">;

/** Draws the path computed by the layout; xyflow's handle coordinates are ignored on purpose. */
function MindEdgeView({ data }: EdgeProps<MindFlowEdge>) {
  if (!data) return null;
  const relationId = data.relationId;
  return (
    <>
      {relationId && (
        <path className="mind-relation-hit" d={data.path} onClick={() => useEditor.getState().removeRelation(relationId)}>
          <title>{t.editor.removeRelation}</title>
        </path>
      )}
      <path
        className="mind-edge"
        data-relation={relationId ? "" : undefined}
        d={data.path}
        fill="none"
        stroke={branchVar(data.color)}
        strokeWidth={data.width}
        strokeLinecap="round"
        strokeLinejoin="round"
        shapeRendering="geometricPrecision"
        opacity={data.dimmed ? 0.3 : 1}
      />
    </>
  );
}

export const MindEdgeComponent = memo(MindEdgeView);
