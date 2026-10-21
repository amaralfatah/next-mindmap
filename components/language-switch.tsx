"use client";

import { LanguagesIcon } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dictionaries, locales, type Locale } from "@/lib/i18n";

/** Language picker. Each option is written in its own language, so either reader can find theirs. */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useT();
  const [locale, setLocale] = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" aria-label={t.home.language} title={t.home.language} className={className} />
        }
      >
        <LanguagesIcon />
        <span className="font-medium uppercase max-sm:sr-only">{locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
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
