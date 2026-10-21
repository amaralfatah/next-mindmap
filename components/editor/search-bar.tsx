"use client";

import { ChevronDownIcon, ChevronUpIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { IconButton } from "@/components/icon-button";
import { useEditor } from "@/lib/editor/store";
import { useT } from "@/components/i18n-provider";

export function SearchBar() {
  const t = useT();
  const search = useEditor((s) => s.search);
  const { setQuery, stepSearch, closeSearch } = useEditor.getState();
  const input = useRef<HTMLInputElement>(null);
  const openTick = useEditor((s) => s.search.open);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, [openTick]);

  return (
    <div
      role="search"
      className="pointer-events-auto flex h-10 items-center gap-1 rounded-xl border bg-background/95 p-1 pl-2.5 shadow-sm max-sm:absolute max-sm:inset-x-2 max-sm:top-[calc(env(safe-area-inset-top,0px)+3.5rem)] sm:w-80"
    >
      <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
      <input
        ref={input}
        value={search.query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            stepSearch(e.shiftKey ? -1 : 1);
          } else if (e.key === "Escape") {
            e.preventDefault();
            closeSearch();
          }
        }}
        placeholder={t.editor.searchPlaceholder}
        aria-label={t.editor.search}
        className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
      />
      {search.query && (
        <span className="shrink-0 px-1 text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {t.editor.searchCount(search.results.length ? search.index + 1 : 0, search.results.length)}
        </span>
      )}
      <IconButton label={t.editor.previous} keys={["Shift", "Enter"]} size="icon-sm" onClick={() => stepSearch(-1)} disabled={!search.results.length}>
        <ChevronUpIcon />
      </IconButton>
      <IconButton label={t.editor.next} keys={["Enter"]} size="icon-sm" onClick={() => stepSearch(1)} disabled={!search.results.length}>
        <ChevronDownIcon />
      </IconButton>
      <IconButton label={t.editor.closeSearch} keys={["Esc"]} size="icon-sm" onClick={closeSearch}>
        <XIcon />
      </IconButton>
    </div>
  );
}
