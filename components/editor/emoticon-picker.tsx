"use client";

import { ClockIcon, SearchIcon, SmileIcon, XIcon } from "lucide-react";
import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditor } from "@/lib/editor/store";
import { useT } from "@/components/i18n-provider";
import type { MindNode } from "@/lib/model";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sararia_recent_emoticons";
const MAX_RECENT = 12;

import {
  CATEGORIES,
  EMOTICON_DATA,
  type EmoticonCategory,
  type EmoticonItem,
} from "./emoticon-data";

export type EmoticonPickerProps = {
  /** If provided, updates this node by default */
  node?: MindNode;
  /** Custom onSelect callback */
  onSelect?: (emoticon: string) => void;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  className?: string;
  triggerButton?: React.ReactNode;
};

/**
 * Emoticon picker popover allowing users to easily browse and insert emojis and kaomoji
 * into mind map nodes or notes.
 */
export function EmoticonPicker({
  node,
  onSelect,
  side = "top",
  align = "start",
  className,
  triggerButton,
}: EmoticonPickerProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<EmoticonCategory>("popular");
  const [query, setQuery] = useState("");
  const [placement, setPlacement] = useState<"append" | "prepend">("append");
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.slice(0, MAX_RECENT);
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const saveRecent = (char: string) => {
    try {
      const next = [char, ...recent.filter((c) => c !== char)].slice(0, MAX_RECENT);
      setRecent(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const handleSelect = (char: string, e: MouseEvent) => {
    e.stopPropagation();
    saveRecent(char);

    if (onSelect) {
      onSelect(char);
    } else if (node) {
      const { editingId, draft, setDraft, patch } = useEditor.getState();
      const isEditing = editingId === node.id;

      if (isEditing) {
        const current = draft;
        const next =
          placement === "prepend"
            ? current ? `${char} ${current}` : char
            : current ? `${current} ${char}` : char;
        setDraft(next);
      } else {
        const current = node.text || "";
        const next =
          placement === "prepend"
            ? current ? `${char} ${current}` : char
            : current ? `${current} ${char}` : char;
        patch({ text: next }, node.id);
      }
    }

    // Keep open if user holds Shift, otherwise close
    if (!e.shiftKey) {
      setOpen(false);
    }
  };

  // Filtered list based on search query
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches: EmoticonItem[] = [];
    const seen = new Set<string>();

    for (const cat of Object.values(EMOTICON_DATA)) {
      for (const item of cat) {
        if (seen.has(item.char)) continue;
        if (item.char.includes(q) || item.name.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q)) {
          seen.add(item.char);
          matches.push(item);
        }
      }
    }
    return matches;
  }, [query]);

  const activeItems = useMemo(() => {
    return EMOTICON_DATA[activeCategory] || [];
  }, [activeCategory]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                triggerButton ? (
                  (triggerButton as React.ReactElement)
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-9 text-foreground/80 hover:text-foreground [&_svg]:size-[18px]",
                      open && "bg-accent text-foreground",
                      className,
                    )}
                    aria-label={t.editor.emoticon}
                  >
                    <SmileIcon />
                  </Button>
                )
              }
            />
          }
        >
          <SmileIcon />
        </TooltipTrigger>
        <TooltipContent side={side}>{t.editor.emoticon}</TooltipContent>
      </Tooltip>

      <PopoverContent
        side={side}
        align={align}
        className="w-[310px] p-2.5 shadow-xl sm:w-[330px]"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Search & Placement Controls */}
        <div className="flex flex-col gap-2">
          <div className="relative flex items-center">
            <SearchIcon className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.editor.emoticonSearch}
              className="h-8 w-full rounded-lg border border-border/80 bg-background pl-8 pr-7 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ink"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 grid size-4 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label={t.editor.emoticonClearSearch}
              >
                <XIcon className="size-3" />
              </button>
            )}
          </div>

          {/* Placement Toggle: Prepend / Append */}
          <div className="flex items-center justify-between px-0.5 text-[11px] text-muted-foreground">
            <span>Posisi:</span>
            <div className="flex rounded-md border border-border/60 bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setPlacement("prepend")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  placement === "prepend" ? "bg-background text-foreground shadow-2xs" : "hover:text-foreground",
                )}
              >
                {t.editor.emoticonPrepend}
              </button>
              <button
                type="button"
                onClick={() => setPlacement("append")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  placement === "append" ? "bg-background text-foreground shadow-2xs" : "hover:text-foreground",
                )}
              >
                {t.editor.emoticonAppend}
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs (shown when not searching) */}
        {!query && (
          <div className="mt-2 flex items-center justify-between gap-0.5 overflow-x-auto border-b border-border/70 pb-1 [scrollbar-width:none]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "relative flex shrink-0 flex-col items-center gap-0.5 px-1.5 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                  activeCategory === cat.id ? "text-ink font-semibold" : "text-muted-foreground hover:text-foreground",
                )}
                title={cat.label}
              >
                <span className="text-sm leading-none">{cat.icon}</span>
                <span className="text-[10px]">{cat.label}</span>
                {activeCategory === cat.id && (
                  <span className="absolute inset-x-1 -bottom-1 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Emoticon Grid Content */}
        <div className="mt-2 max-h-[220px] overflow-y-auto px-0.5 [scrollbar-width:thin]">
          {query ? (
            searchResults.length > 0 ? (
              <div className="grid grid-cols-7 gap-1">
                {searchResults.map((item) => (
                  <button
                    key={item.char}
                    type="button"
                    onClick={(e) => handleSelect(item.char, e)}
                    className="grid size-9 place-items-center rounded-lg text-lg transition-transform duration-100 ease-out hover:scale-115 hover:bg-muted active:scale-95 cursor-pointer"
                    title={item.name}
                  >
                    {item.char}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p>{t.editor.emoticonNoMatch}</p>
              </div>
            )
          ) : (
            <>
              {/* Recent Row if available and on popular tab */}
              {activeCategory === "popular" && recent.length > 0 && (
                <div className="mb-2">
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ClockIcon className="size-3" />
                    <span>{t.editor.emoticonRecent}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {recent.map((char) => (
                      <button
                        key={`recent-${char}`}
                        type="button"
                        onClick={(e) => handleSelect(char, e)}
                        className="grid size-8 place-items-center rounded-md text-base transition-transform duration-100 ease-out hover:scale-110 hover:bg-muted active:scale-95 cursor-pointer"
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Kaomoji (text) list or Emoji grid */}
              {activeCategory === "kaomoji" ? (
                <div className="flex flex-wrap gap-1.5 py-1">
                  {activeItems.map((item) => (
                    <button
                      key={item.char}
                      type="button"
                      onClick={(e) => handleSelect(item.char, e)}
                      className="rounded-lg border border-border/80 bg-muted/40 px-2 py-1 font-mono text-xs text-foreground transition-all hover:border-ink hover:bg-background hover:text-ink active:scale-95 cursor-pointer"
                      title={item.name}
                    >
                      {item.char}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1 py-0.5">
                  {activeItems.map((item) => (
                    <button
                      key={item.char}
                      type="button"
                      onClick={(e) => handleSelect(item.char, e)}
                      className="grid size-9 place-items-center rounded-lg text-lg transition-transform duration-100 ease-out hover:scale-115 hover:bg-muted active:scale-95 cursor-pointer"
                      title={item.name}
                    >
                      {item.char}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
