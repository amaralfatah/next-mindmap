"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Notice } from "@/components/notice";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { useAutosave } from "@/lib/editor/autosave";
import { LayoutProvider } from "@/lib/editor/layout-context";
import { useEditor, useMap } from "@/lib/editor/store";
import { t } from "@/lib/i18n";
import { depthOf, MapFormatError } from "@/lib/model";
import { loadMap, subscribe } from "@/lib/storage";
import { Canvas } from "./canvas";
import { FirstSteps } from "./first-steps";
import { NodeToolbar } from "./node-toolbar";
import { NotesPanel } from "./notes-panel";
import { TopBar } from "./top-bar";
import { useKeyboard } from "./use-keyboard";
import { ZoomControls } from "./zoom-controls";

type Status = { kind: "loading" } | { kind: "ready" } | { kind: "missing" } | { kind: "error"; message: string };

/** Screen-reader summary of the selection, since the canvas itself is visual. */
function Announcer() {
  const map = useMap();
  const selectedId = useEditor((s) => s.selectedId);
  const node = map?.nodes[selectedId];
  if (!map || !node) return null;
  return (
    <p className="sr-only" aria-live="polite">
      {t.editor.selected(node.text, depthOf(map, selectedId), node.childIds.length, Boolean(node.collapsed))}
    </p>
  );
}

function Workspace() {
  useAutosave();
  useKeyboard();
  const shortcutsOpen = useEditor((s) => s.shortcutsOpen);
  const setShortcutsOpen = useEditor((s) => s.setShortcutsOpen);
  return (
    <>
      <Canvas />
      <TopBar />
      <ZoomControls />
      <NodeToolbar />
      <FirstSteps />
      <NotesPanel />
      <Announcer />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}

function CrossTabNotice({ mapId }: { mapId: string }) {
  const [changed, setChanged] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const saveState = useEditor((s) => s.saveState);
  const overwrite = useEditor((s) => s.overwrite);
  const router = useRouter();

  useEffect(
    () =>
      subscribe((msg) => {
        if (msg.type === "saved" && msg.mapId === mapId) setChanged(true);
        if (msg.type === "deleted" && msg.mapId === mapId) setDeleted(true);
      }),
    [mapId],
  );

  async function reload() {
    try {
      const map = await loadMap(mapId);
      if (map) useEditor.getState().replace(map);
    } finally {
      setChanged(false);
    }
  }

  function keepMine() {
    setChanged(false);
    setDeleted(false);
    overwrite();
  }

  const showDeleted = deleted || saveState === "deleted";
  const showChanged = !showDeleted && (changed || saveState === "conflict");
  if (!showDeleted && !showChanged) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-2 top-16 z-30 mx-auto max-w-xl">
      {showChanged ? (
        <Notice
          tone={saveState === "conflict" ? "warn" : "info"}
          icon={<RefreshCwIcon />}
          actions={
            <>
              {saveState === "conflict" && (
                <Button size="sm" variant="ghost" onClick={keepMine}>
                  {t.editor.keepMine}
                </Button>
              )}
              <Button size="sm" onClick={reload}>
                {t.editor.reload}
              </Button>
            </>
          }
        >
          {saveState === "conflict" ? t.editor.conflict : t.editor.otherTab}
        </Notice>
      ) : (
        <Notice
          tone="warn"
          icon={<TriangleAlertIcon />}
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => router.push("/")}>
                {t.editor.back}
              </Button>
              <Button size="sm" onClick={keepMine}>
                {t.editor.restore}
              </Button>
            </>
          }
        >
          {t.editor.deletedElsewhere}
        </Notice>
      )}
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="dot-paper grid min-h-dvh place-items-center p-6">
      <div className="rise max-w-sm text-center">
        <Wordmark className="mb-8" />
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{body}</p>
        <Button className="mt-6" nativeButton={false} render={<Link href="/" />}>
          {t.editor.back}
        </Button>
      </div>
    </main>
  );
}

/** Reads the map id from the URL; keyed so switching maps starts from a clean loading state. */
export function EditorRoute() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  return <Editor key={id} id={id} isNew={params.get("new") === "1"} />;
}

function Editor({ id, isNew }: { id: string; isNew: boolean }) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const map = id ? await loadMap(id) : null;
        if (!alive) return;
        if (!map) return setStatus({ kind: "missing" });
        useEditor.getState().load(map, { editRoot: isNew });
        setStatus({ kind: "ready" });
        // Drop ?new=1 so a reload doesn't start editing the title again.
        if (isNew) router.replace(`/map?id=${encodeURIComponent(id)}`);
      } catch (e) {
        if (alive) setStatus({ kind: "error", message: e instanceof MapFormatError ? e.message : String(e) });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per map id
  }, [id]);

  useEffect(() => {
    const title = useEditor.getState().history?.present.map.title;
    if (status.kind === "ready" && title) document.title = `${title} · Mind Map`;
    return useEditor.subscribe((s, prev) => {
      const next = s.history?.present.map.title;
      if (next && next !== prev.history?.present.map.title) document.title = `${next} · Mind Map`;
    });
  }, [status.kind]);

  if (status.kind === "missing") return <Message title={t.editor.notFoundTitle} body={t.editor.notFoundBody} />;
  if (status.kind === "error") return <Message title={t.editor.loadErrorTitle} body={status.message} />;

  return (
    <main className="fixed inset-0 overflow-hidden overscroll-none bg-background">
      {status.kind === "loading" ? (
        <div className="dot-paper flex h-full w-full flex-col items-center justify-center gap-3" role="status" aria-busy>
          <span className="inline-block size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{t.editor.loadingMap}</p>
        </div>
      ) : (
        <ReactFlowProvider>
          <LayoutProvider>
            <Workspace />
            <CrossTabNotice mapId={id} />
          </LayoutProvider>
        </ReactFlowProvider>
      )}
    </main>
  );
}
