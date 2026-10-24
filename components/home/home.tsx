"use client";

import {
  ArrowRightIcon,
  ClipboardPasteIcon,
  CopyIcon,
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { Notice } from "@/components/notice";
import { LanguageSwitch } from "@/components/language-switch";
import { ThemeToggle } from "@/components/theme";
import { AuthButton } from "@/components/auth-button";
import { useSession } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/wordmark";
import { useLocale, useT } from "@/components/i18n-provider";
import { getT, type Locale } from "@/lib/i18n";
import { createSampleMap } from "@/lib/sample";
import { importMarkdown } from "@/lib/io";
import {
  createMap,
  duplicateMap,
  nodeCount,
  renameMap,
  type MindMap,
} from "@/lib/model";
import {
  adoptLegacyGuestMaps,
  broadcast,
  deleteMap,
  listMaps,
  loadMap,
  saveMap,
  subscribe,
} from "@/lib/storage";
import { DeleteDialog, PasteOutlineDialog, RenameDialog } from "./dialogs";
import { HeroArt } from "./hero-art";
import { MapThumb } from "./map-thumb";

function timeAgo(ms: number, now: number, locale: Locale, justNow: string): string {
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const seconds = Math.round((ms - now) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps)
    if (Math.abs(seconds) >= size)
      return relative.format(Math.round(seconds / size), unit);
  return justNow;
}

type Dialog =
  { kind: "rename" | "delete"; map: MindMap } | { kind: "paste" } | null;

function MapCardSkeleton({ index }: { index: number }) {
  return (
    <li
      className="rise group relative"
      style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
    >
      <div className="card-surface overflow-hidden rounded-2xl">
        <div className="aspect-[16/9] border-b bg-paper-2/70 p-3 flex items-center justify-center">
          <div className="size-8 rounded-full bg-muted/70 animate-pulse" />
        </div>
        <div className="p-3 pr-12 space-y-2">
          <div className="h-5 w-3/4 rounded-md bg-muted/80 animate-pulse" />
          <div className="h-3.5 w-1/2 rounded-md bg-muted/50 animate-pulse" />
        </div>
      </div>
    </li>
  );
}

function MapCard({
  map,
  now,
  onRename,
  onDuplicate,
  onDelete,
  index,
}: {
  map: MindMap;
  now: number;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  index: number;
}) {
  const t = useT();
  const [locale] = useLocale();
  const href = `/map?id=${encodeURIComponent(map.id)}`;
  return (
    <li
      className="rise group relative"
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      <Link
        href={href}
        className="card-surface card-lift block overflow-hidden rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="aspect-[16/9] border-b bg-paper-2 p-3">
          <MapThumb map={map} />
        </div>
        <div className="p-3 pr-12">
          <h3
            className="truncate text-[17px] font-semibold"
            title={map.title}
          >
            {map.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t.home.edited(timeAgo(map.updatedAt, now, locale, t.home.justNow))} ·{" "}
            {t.home.nodes(nodeCount(map))}
          </p>
        </div>
      </Link>
      <div className="absolute right-2 bottom-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={t.home.mapActions(map.title)}
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-48">
            <DropdownMenuItem onClick={onRename}>
              <PencilIcon />
              {t.home.rename}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <CopyIcon />
              {t.home.duplicate}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon />
              {t.home.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

/**
 * "landing" is the signed-out welcome at `/`; "maps" is the signed-in home at `/maps`. The pages
 * redirect on the server; the effect below follows sign-in and sign-out that happen in place.
 */
export function Home({ view }: { view: "landing" | "maps" }) {
  const t = useT();
  const [locale] = useLocale();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id ?? null;
  const [maps, setMaps] = useState<MindMap[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [broken, setBroken] = useState(0);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await listMaps();
      setMaps(result.maps);
      setBroken(result.broken.length);
      setNow(Date.now());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  // Maps belong to the signed-in account, so reload the list whenever the session changes
  // (sign in or out) instead of requiring a page refresh.
  useEffect(() => {
    if (isPending) return;
    if (view === "landing" && userId) return router.replace("/maps");
    if (view === "maps" && !userId) return router.replace("/");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMaps(null);
    if (!userId) return;
    void (async () => {
      const adopted = await adoptLegacyGuestMaps();
      if (adopted) toast.success(getT().notices.adopted(adopted));
      await refresh();
    })();
    return subscribe(() => void refresh());
  }, [refresh, userId, isPending, view, router]);

  // Header edge appears only once content scrolls beneath it, instead of a permanent divider.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filtered = useMemo(() => {
    if (!maps) return [];
    const q = query.trim().toLocaleLowerCase();
    return q
      ? maps.filter((m) => m.title.toLocaleLowerCase().includes(q))
      : maps;
  }, [maps, query]);

  async function persistNew(list: MindMap[]) {
    for (const m of list) await saveMap(m);
    broadcast({ type: "list-changed" });
  }

  // Guards against double clicks creating duplicate maps, and surfaces save failures.
  async function createAndOpen(map: MindMap, suffix = "") {
    if (busy) return;
    setBusy(true);
    try {
      await persistNew([map]);
      router.push(`/map?id=${encodeURIComponent(map.id)}${suffix}`);
    } catch (err) {
      setBusy(false);
      toast.error(t.notices.createFailed, { description: String(err) });
    }
  }

  const newMap = () => createAndOpen(createMap(t.editor.defaultTitle), "&new=1");
  const openSample = () => createAndOpen(createSampleMap(locale));

  async function createFromOutline(markdown: string, fallbackTitle: string) {
    const map = importMarkdown(markdown, fallbackTitle);
    await persistNew([map]);
    setDialog(null);
    router.push(`/map?id=${encodeURIComponent(map.id)}`);
  }

  async function rename(map: MindMap, title: string) {
    const fresh = (await loadMap(map.id).catch(() => null)) ?? map;
    await saveMap(renameMap(fresh, title));
    broadcast({ type: "saved", mapId: map.id, updatedAt: Date.now() });
    setDialog(null);
    await refresh();
  }

  async function duplicate(map: MindMap) {
    await saveMap(duplicateMap(map, map.title + t.home.copySuffix));
    broadcast({ type: "list-changed" });
    await refresh();
  }

  async function remove(map: MindMap) {
    await deleteMap(map.id);
    broadcast({ type: "deleted", mapId: map.id });
    setDialog(null);
    await refresh();
  }

  const hasMaps = view === "maps" && Boolean(userId && maps?.length);
  // The server already checked the session, so `/maps` shows the skeleton until the list arrives.
  const loading = view === "maps" && (!userId || maps === null) && !loadError;
  const signedIn = view === "maps";

  const actions = (size?: "lg") => {
    const cls = size ? "h-11 px-5 text-[15px]" : undefined;
    return (
      <>
        <Button
          variant="outline"
          size={size}
          className={cls}
          onClick={() => setDialog({ kind: "paste" })}
        >
          <ClipboardPasteIcon data-icon="inline-start" />
          <span className="max-sm:hidden">{t.home.pasteOutline}</span>
          <span className="sm:hidden">{t.home.pasteShort}</span>
        </Button>
      </>
    );
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-foreground px-3 py-2 text-background focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t.app.skip}
      </a>
      <header
        data-scrolled={scrolled}
        className="material sticky top-0 z-20 border-b border-transparent bg-background/72 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-180 transition-[border-color] duration-200 ease-out data-[scrolled=true]:border-border"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            href={signedIn ? "/maps" : "/"}
            className="flex items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Wordmark className="whitespace-nowrap" />
          </Link>
          <div className="flex-1" />
          <LanguageSwitch />
          <ThemeToggle />
          {hasMaps && (
            <Button onClick={newMap} disabled={busy} className="shrink-0">
              <PlusIcon data-icon="inline-start" />
              <span className="max-sm:sr-only">{t.home.newMap}</span>
            </Button>
          )}
          {/* Signed out, the hero's own sign-in button is the action; on phones one is enough. */}
          <AuthButton className={signedIn ? undefined : "max-sm:hidden"} />
        </div>
      </header>

      <main
        id="main"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 sm:px-6"
      >
        {broken > 0 && (
          <div className="pt-2">
            <Notice tone="warn" icon={<TriangleAlertIcon />}>
              {t.home.brokenMaps(broken)}
            </Notice>
          </div>
        )}

        {loadError && (
          <div className="pt-4">
            <Notice
              tone="warn"
              icon={<TriangleAlertIcon />}
              actions={
                <Button size="sm" onClick={() => void refresh()}>
                  {t.home.retry}
                </Button>
              }
            >
              {t.home.loadFailed}
            </Notice>
          </div>
        )}

        {loading ? (
          <section aria-label={t.home.loading} className="pt-8" role="status" aria-busy="true">
            <div className="flex flex-wrap items-end gap-3">
              <div className="h-9 w-40 rounded-lg bg-muted/70 animate-pulse" />
              <div className="ml-auto h-9 w-48 rounded-lg bg-muted/50 animate-pulse max-sm:hidden" />
            </div>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <MapCardSkeleton key={i} index={i} />
              ))}
            </ul>
          </section>
        ) : loadError ? null : !hasMaps ? (
          <section className="grid items-center gap-8 pt-8 pb-12 sm:gap-10 lg:my-auto lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:py-10">
            <div className="rise">
              <h1 className="text-[clamp(2.5rem,5.2vw,4rem)] leading-[1.05] font-bold tracking-[-0.03em] text-balance">
                {t.home.heroTitle}
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-pretty text-muted-foreground">
                {t.home.heroLead}
              </p>
              {signedIn ? (
                <>
                  <div className="mt-8 flex flex-wrap items-center gap-2">
                    <Button
                      size="lg"
                      className="h-11 px-5 text-[15px]"
                      onClick={newMap}
                      disabled={busy}
                    >
                      <PlusIcon data-icon="inline-start" />
                      {t.home.newMap}
                    </Button>
                    {actions("lg")}
                  </div>
                  <button
                    type="button"
                    onClick={openSample}
                    disabled={busy}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-ink underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                  >
                    {t.home.sample}
                    <ArrowRightIcon className="size-3.5" aria-hidden />
                  </button>
                </>
              ) : (
                <div className="mt-8 flex flex-wrap items-center gap-2">
                  <AuthButton cta={t.auth.signInToStart} />
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-11 px-5 text-[15px]"
                    nativeButton={false}
                    render={<Link href="/demo" />}
                  >
                    {t.home.tryFirst}
                  </Button>
                </div>
              )}
            </div>
            <figure className="rise card-surface overflow-hidden rounded-3xl sm:rounded-[2rem] [animation-delay:120ms]">
              <div className="dot-paper px-2 py-4 sm:px-6 sm:py-7">
                <HeroArt crop className="sm:hidden" />
                <HeroArt className="max-sm:hidden" />
              </div>
            </figure>
          </section>
        ) : (
          <section aria-labelledby="maps-title" className="pt-8">
            <div className="flex flex-wrap items-end gap-3">
              <h1
                id="maps-title"
                className="mr-auto text-[2rem] leading-tight font-bold tracking-[-0.025em]"
              >
                {t.home.yourMaps}
              </h1>
              <div className="relative w-full sm:w-64">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.home.searchPlaceholder}
                  aria-label={t.home.searchPlaceholder}
                  className="h-9 pl-8"
                />
              </div>
              <div className="flex gap-2">{actions()}</div>
            </div>
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">
                  {t.home.noResults(query.trim())}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery("")}
                  className="mt-4"
                >
                  {t.home.clearSearch}
                </Button>
              </div>
            ) : (
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((map, i) => (
                  <MapCard
                    key={map.id}
                    map={map}
                    now={now}
                    index={i}
                    onRename={() => setDialog({ kind: "rename", map })}
                    onDuplicate={() => duplicate(map)}
                    onDelete={() => setDialog({ kind: "delete", map })}
                  />
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-5 text-sm text-muted-foreground sm:px-6">
          <span className="mr-auto" />
          <a
            href="https://sararia.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline"
          >
            {t.home.madeBy}
          </a>
        </div>
      </footer>

      <RenameDialog
        title={dialog?.kind === "rename" ? dialog.map.title : ""}
        open={dialog?.kind === "rename"}
        onOpenChange={(open) => !open && setDialog(null)}
        onSave={(title) =>
          dialog?.kind === "rename" && rename(dialog.map, title)
        }
      />
      <DeleteDialog
        title={dialog?.kind === "delete" ? dialog.map.title : ""}
        open={dialog?.kind === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={() => dialog?.kind === "delete" && remove(dialog.map)}
      />
      <PasteOutlineDialog
        open={dialog?.kind === "paste"}
        onOpenChange={(open) => !open && setDialog(null)}
        onCreate={createFromOutline}
      />
    </div>
  );
}
