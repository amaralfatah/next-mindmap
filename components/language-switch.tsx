"use client";

import { GlobeIcon } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { setThemeMode, themeIcons, themeModes, useThemeMode, type ThemeMode } from "@/components/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dictionaries, locales, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Language picker for the footer, where Apple's sites keep it: a quiet link that names the current
 * language. Each option is written in its own language, so either reader can find theirs.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useT();
  const [locale, setLocale] = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${t.home.language}: ${t.home.languageName}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 pointer-coarse:min-h-9 [&_svg]:size-3.5",
          className,
        )}
      >
        <GlobeIcon aria-hidden />
        {t.home.languageName}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-auto min-w-44">
        <DropdownMenuRadioGroup value={locale} onValueChange={(value) => setLocale(value as Locale)}>
          {locales.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} lang={l} closeOnClick>
              {dictionaries[l].home.languageName}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Appearance and Language as submenus, for the account menu where app-wide settings live. */
export function PreferenceSubmenus() {
  const t = useT();
  const [locale, setLocale] = useLocale();
  const mode = useThemeMode();
  const ModeIcon = themeIcons[mode];
  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <ModeIcon />
          <span>{t.prefs.appearance}</span>
          <span className="ml-auto pl-3 text-xs text-muted-foreground">{t.prefs[mode]}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-36">
          <DropdownMenuRadioGroup value={mode} onValueChange={(value) => setThemeMode(value as ThemeMode)}>
            {themeModes.map((m) => {
              const Icon = themeIcons[m];
              return (
                <DropdownMenuRadioItem key={m} value={m} closeOnClick>
                  <Icon />
                  {t.prefs[m]}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <GlobeIcon />
          <span>{t.home.language}</span>
          <span className="ml-auto pl-3 text-xs text-muted-foreground uppercase">{locale}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-44">
          <DropdownMenuRadioGroup value={locale} onValueChange={(value) => setLocale(value as Locale)}>
            {locales.map((l) => (
              <DropdownMenuRadioItem key={l} value={l} lang={l} closeOnClick>
                {dictionaries[l].home.languageName}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
