"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { t } from "@/lib/i18n";

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t.dialogs.shortcutsTitle}</DialogTitle>
        </DialogHeader>
        <dl className="-mx-1 grid max-h-[65dvh] gap-x-6 overflow-y-auto px-1 sm:grid-cols-2">
          {t.shortcuts.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3 border-b border-dashed py-2 text-sm">
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd>
                <KbdGroup>
                  {s.keys.map((k) => (
                    <Kbd key={k} className="min-w-6 font-mono">
                      {k}
                    </Kbd>
                  ))}
                </KbdGroup>
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
