"use client";

import {
  ChevronLeftIcon,
  CloudAlertIcon,
  CloudCheckIcon,
  Columns2Icon,
  KeyboardIcon,
  LoaderCircleIcon,
  Redo2Icon,
  SearchIcon,
  Undo2Icon,
} from "lucide-react";
import Link from "next/link";
import { IconButton } from "@/components/icon-button";
import { ThemeToggle } from "@/components/theme";
import { AuthButton } from "@/components/auth-button";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditor, useMap } from "@/lib/editor/store";
import { useT } from "@/components/i18n-provider";
import { useIsDemo } from "./demo-context";
import { SearchBar } from "./search-bar";

/** In the demo there is nothing to save; say so plainly where the save status usually sits. */
function DemoStatus() {
  const t = useT();
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground">
      <span className="sm:hidden">{t.editor.demoShort}</span>
      <span className="max-sm:hidden">{t.editor.demoLabel}</span>
    </span>
  );
}

function SaveStatus() {
  const t = useT();
  const state = useEditor((s) => s.saveState);
  const failed = state === "error" || state === "conflict" || state === "deleted" || state === "signedOut";
  const label = state === "saving" ? t.editor.saving : failed ? t.editor.saveError : t.editor.saved;
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground data-[state=error]:text-destructive"
      data-state={failed ? "error" : state}
    >
      {state === "saving" ? (
        <LoaderCircleIcon className="size-3.5 animate-spin" />
      ) : failed ? (
        <CloudAlertIcon className="size-3.5" />
      ) : (
        <CloudCheckIcon className="size-3.5" />
      )}
      <span className="max-sm:sr-only">{label}</span>
    </span>
  );
}

export function TopBar() {
  const demo = useIsDemo();
  const t = useT();
  const map = useMap();
  const canUndo = useEditor((s) => Boolean(s.history?.past.length));
  const canRedo = useEditor((s) => Boolean(s.history?.future.length));
  const searchOpen = useEditor((s) => s.search.open);
  const { undo, redo, balanceLayout, openSearch, setShortcutsOpen, startEdit } = useEditor.getState();

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start gap-2 pb-2 pt-[max(0.625rem,env(safe-area-inset-top))] pl-[max(0.625rem,env(safe-area-inset-left))] pr-[max(0.625rem,env(safe-area-inset-right))]">
      <div className="pointer-events-auto flex min-w-0 max-w-[min(32rem,100%)] items-center gap-1 glass rounded-2xl border p-1 pr-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/"
                aria-label={t.editor.back}
                className={buttonVariants({ variant: "ghost", size: "sm", className: "px-1.5 pointer-coarse:h-9 pointer-coarse:px-2" })}
              />
            }
          >
            <ChevronLeftIcon className="text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent side="bottom">{t.editor.back}</TooltipContent>
        </Tooltip>
        <button
          type="button"
          onClick={() => map && startEdit(map.rootId)}
          className="min-w-0 truncate rounded-md px-1.5 py-1 text-left text-[15px] font-semibold tracking-[-0.01em] hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:max-w-[32rem]"
          title={map?.title}
        >
          {map?.title}
        </button>
        {demo ? <DemoStatus /> : <SaveStatus />}
      </div>

      <div className="flex-1" />

      {searchOpen && <SearchBar />}

      <div className="pointer-events-auto flex shrink-0 items-center gap-0.5 glass rounded-2xl border p-1">
        {!searchOpen && (
          <IconButton label={t.editor.search} keys={["Ctrl", "F"]} onClick={openSearch}>
            <SearchIcon />
          </IconButton>
        )}
        <IconButton label={t.editor.undo} keys={["Ctrl", "Z"]} onClick={undo} disabled={!canUndo} className="max-sm:hidden">
          <Undo2Icon />
        </IconButton>
        <IconButton label={t.editor.redo} keys={["Ctrl", "Shift", "Z"]} onClick={redo} disabled={!canRedo} className="max-sm:hidden">
          <Redo2Icon />
        </IconButton>
        <IconButton label={t.editor.balanceLayout} onClick={balanceLayout} className="max-sm:hidden">
          <Columns2Icon />
        </IconButton>
        <IconButton label={t.editor.shortcuts} keys={["Ctrl", "/"]} onClick={() => setShortcutsOpen(true)} className="max-sm:hidden">
          <KeyboardIcon />
        </IconButton>
        <ThemeToggle className="max-sm:hidden" />
        <AuthButton compact />
      </div>
    </header>
  );
}
