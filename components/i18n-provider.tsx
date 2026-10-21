"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { dictionaries, LOCALE_COOKIE, setActiveDict, type Dict, type Locale } from "@/lib/i18n";
import { setPlaceholder } from "@/lib/layout";

type I18n = { locale: Locale; t: Dict; setLocale: (locale: Locale) => void };

const I18nContext = createContext<I18n | null>(null);

/** Holds the person's language. The server passes the cookie's choice, so first paint already matches. */
export function I18nProvider({ locale: initial, children }: { locale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState(initial);
  const router = useRouter();
  const t = dictionaries[locale];
  if (typeof window !== "undefined") {
    // Plain modules (toasts, layout measuring) read these; keep them on the chosen language.
    setActiveDict(t);
    setPlaceholder(t.editor.untitled);
  }

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      setLocaleState(next);
      // Server-rendered bits (page title, description) follow on the next render.
      router.refresh();
    },
    [router],
  );

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useT must be used inside I18nProvider");
  return value;
}

/** The active dictionary. */
export function useT(): Dict {
  return useI18n().t;
}

export function useLocale(): [Locale, (locale: Locale) => void] {
  const { locale, setLocale } = useI18n();
  return [locale, setLocale];
}
