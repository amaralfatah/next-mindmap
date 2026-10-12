"use client";

import { PaintRoller } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEditor } from "@/lib/editor/store";
import { t } from "@/lib/i18n";
import type { MindNode } from "@/lib/model";
import { cn } from "@/lib/utils";

export const THEME_PALETTE = [
  "#4c6ef5",
  "#845ef7",
  "#f06595",
  "#ff6b6b",
  "#fd7e14",
  "#fcc419",
  "#94d82d",
  "#51cf66",
  "#22b8cf",
  "#339af0",
  "#343a40",
  "#868e96",
  "#ffffff",
] as const;

export type NodeStylePickerProps = {
  node: MindNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  className?: string;
};

/**
 * Node style popover allowing users to customize Shape (fill) and Border.
 */
export function NodeStylePicker({ node, side = "top", align = "start", className }: NodeStylePickerProps) {
  const patch = useEditor((s) => s.patch);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"shape" | "border">("shape");
  const colorInputRef = useRef<HTMLInputElement>(null);

  const currentValue = tab === "shape" ? node.fill : node.border;
  const isNone = !currentValue;
  const isCustom = Boolean(currentValue && !THEME_PALETTE.includes(currentValue as (typeof THEME_PALETTE)[number]));
  const hasStyle = Boolean(node.fill || node.border);

  const handleSelectColor = (color: string | undefined) => {
    if (tab === "shape") {
      patch({ fill: color }, node.id);
    } else {
      patch({ border: color }, node.id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "size-9 text-foreground/80 hover:text-foreground [&_svg]:size-[18px]",
              (open || hasStyle) && "bg-primary/15 text-primary hover:bg-primary/20",
              className,
            )}
            aria-label={t.editor.style}
            title={t.editor.style}
          />
        }
      >
        <PaintRoller />
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className="w-[280px] p-3 shadow-xl border border-border/70 bg-popover/90 backdrop-blur-xl">
        <input
          ref={colorInputRef}
          type="color"
          value={typeof currentValue === "string" && currentValue.startsWith("#") ? currentValue : "#339af0"}
          onChange={(e) => handleSelectColor(e.target.value)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />

        <div className="flex border-b border-border/80">
          <button
            type="button"
            onClick={() => setTab("shape")}
            className={cn(
              "relative flex-1 pb-2 pt-1 text-center text-sm font-semibold transition-colors cursor-pointer",
              tab === "shape" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.editor.shape}
            {tab === "shape" && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
          <button
            type="button"
            onClick={() => setTab("border")}
            className={cn(
              "relative flex-1 pb-2 pt-1 text-center text-sm font-semibold transition-colors cursor-pointer",
              tab === "border" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.editor.border}
            {tab === "border" && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        </div>

        <div className="px-0.5 pt-3 pb-1">
          <div className="mb-2 text-xs font-medium text-muted-foreground/80">
            {t.editor.themeColors}
          </div>
          <div
            className="grid grid-cols-6 gap-1"
            role="radiogroup"
            aria-label={tab === "shape" ? t.editor.shape : t.editor.border}
          >
            {/* Custom color / Rainbow button */}
            <button
              type="button"
              role="radio"
              aria-checked={isCustom}
              title={t.editor.customColor}
              aria-label={t.editor.customColor}
              onClick={() => colorInputRef.current?.click()}
              className={cn(
                "grid size-9 place-items-center rounded-xl transition-all duration-120 cursor-pointer active:scale-95",
                isCustom
                  ? "bg-primary/15 text-primary ring-1.5 ring-primary/40"
                  : "hover:bg-muted/70",
              )}
            >
              <span
                className="relative grid size-5 place-items-center rounded-full shadow-2xs"
                style={{
                  background:
                    "conic-gradient(from 0deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff0080, #ff0000)",
                }}
              >
                <span className="size-2 rounded-full bg-white dark:bg-card" />
              </span>
            </button>

            {/* None / Clear color (diagonal slash) */}
            <button
              type="button"
              role="radio"
              aria-checked={isNone}
              title={t.editor.noColor}
              aria-label={t.editor.noColor}
              onClick={() => handleSelectColor(undefined)}
              className={cn(
                "grid size-9 place-items-center rounded-xl transition-all duration-120 cursor-pointer active:scale-95",
                isNone
                  ? "bg-primary/15 text-primary ring-1.5 ring-primary/40"
                  : "hover:bg-muted/70",
              )}
            >
              <svg className="size-5" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="10"
                  cy="10"
                  r="7.5"
                  stroke="currentColor"
                  className="text-zinc-300 dark:text-zinc-600"
                  strokeWidth="1.5"
                  fill="none"
                />
                <line x1="4.5" y1="4.5" x2="15.5" y2="15.5" stroke="#ef4444" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>

            {/* Palette colors */}
            {THEME_PALETTE.map((c) => {
              const isSelected = currentValue === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={c}
                  title={c}
                  onClick={() => handleSelectColor(c)}
                  className={cn(
                    "grid size-9 place-items-center rounded-xl transition-all duration-120 cursor-pointer active:scale-95",
                    isSelected
                      ? "bg-primary/15 text-primary ring-1.5 ring-primary/40"
                      : "hover:bg-muted/70",
                  )}
                >
                  <span
                    className={cn(
                      "size-5 rounded-full shadow-2xs",
                      c === "#ffffff" && "border border-zinc-200 dark:border-zinc-700",
                    )}
                    style={{ background: c }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
