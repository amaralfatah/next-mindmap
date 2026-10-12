"use client";

import {
  ChevronLeftIcon,
  CloudAlertIcon,
  CloudCheckIcon,
  Columns2Icon,
  DownloadIcon,
  FileCodeIcon,
  FileJsonIcon,
  FileTextIcon,
  ImageIcon,
  KeyboardIcon,
  LoaderCircleIcon,
  Redo2Icon,
  SearchIcon,
  Undo2Icon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { IconButton } from "@/components/icon-button";
import { ThemeToggle } from "@/components/theme";
import { AuthButton } from "@/components/auth-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Mark } from "@/components/wordmark";
import { exportMap, type ExportFormat } from "@/lib/editor/export";
import { useEditor, useMap } from "@/lib/editor/store";
import { t } from "@/lib/i18n";
import { SearchBar } from "./search-bar";

function SaveStatus() {
  const state = useEditor((s) => s.saveState);
  const failed = state === "error" || state === "conflict" || state === "deleted";
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

const exportItems: { format: ExportFormat; label: string; icon: typeof ImageIcon }[] = [
  { format: "png", label: t.editor.exportPng, icon: ImageIcon },
  { format: "svg", label: t.editor.exportSvg, icon: FileCodeIcon },
  { format: "md", label: t.editor.exportMarkdown, icon: FileTextIcon },
  { format: "opml", label: t.editor.exportOpml, icon: FileCodeIcon },
  { format: "json", label: t.editor.exportJson, icon: FileJsonIcon },
];

export function TopBar() {
  const map = useMap();
  const canUndo = useEditor((s) => Boolean(s.history?.past.length));
  const canRedo = useEditor((s) => Boolean(s.history?.future.length));
  const searchOpen = useEditor((s) => s.search.open);
  const { undo, redo, balanceLayout, openSearch, setShortcutsOpen, startEdit } = useEditor.getState();

  async function runExport(format: ExportFormat) {
    if (!map) return;
    try {
      await exportMap(map, format);
    } catch {
      toast.error(t.editor.exportFailed);
    }
  }

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start gap-2 pb-2 pt-[max(0.625rem,env(safe-area-inset-top))] pl-[max(0.625rem,env(safe-area-inset-left))] pr-[max(0.625rem,env(safe-area-inset-right))]">
      <div className="pointer-events-auto flex min-w-0 items-center gap-1 rounded-2xl border border-border/60 bg-background/80 p-1 pr-2 shadow-md shadow-black/[0.03] backdrop-blur-xl dark:shadow-black/20">
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/"
                aria-label={t.editor.back}
                className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1 px-1.5" })}
              />
            }
          >
            <ChevronLeftIcon className="text-muted-foreground" />
            <Mark className="size-6" />
          </TooltipTrigger>
          <TooltipContent side="bottom">{t.editor.back}</TooltipContent>
        </Tooltip>
        <button
          type="button"
          onClick={() => map && startEdit(map.rootId)}
          className="min-w-0 max-w-[38vw] truncate rounded-md px-1.5 py-1 text-left font-display text-[15px] font-semibold tracking-tight hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:max-w-[32rem]"
          title={map?.title}
        >
          {map?.title}
        </button>
        <SaveStatus />
      </div>

      <div className="flex-1" />

      {searchOpen && <SearchBar />}

      <div className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-border/60 bg-background/80 p-1 shadow-md shadow-black/[0.03] backdrop-blur-xl dark:shadow-black/20">
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
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t.editor.export} />} />}
            >
              <DownloadIcon />
            </TooltipTrigger>
            <TooltipContent side="bottom">{t.editor.export}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-auto min-w-52">
            {exportItems.map(({ format, label, icon: Icon }) => (
              <DropdownMenuItem key={format} onClick={() => runExport(format)}>
                <Icon />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <IconButton label={t.editor.shortcuts} keys={["Ctrl", "/"]} onClick={() => setShortcutsOpen(true)} className="max-sm:hidden">
          <KeyboardIcon />
        </IconButton>
        <ThemeToggle />
        <AuthButton />
      </div>
    </header>
  );
}
