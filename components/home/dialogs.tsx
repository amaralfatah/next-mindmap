"use client";

import { useState, type FormEvent } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/i18n";

export function RenameDialog({
  title,
  open,
  onOpenChange,
  onSave,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed so the field resets to the current title each time it opens. */}
        <RenameForm key={String(open) + title} title={title} onSave={onSave} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({ title, onSave, onCancel }: { title: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(title);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) onSave(value.trim());
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">{t.dialogs.renameTitle}</DialogTitle>
      </DialogHeader>
      <label className="grid gap-1.5 text-sm font-medium">
        {t.dialogs.renameLabel}
        <Input value={value} onChange={(e) => setValue(e.target.value)} autoFocus onFocus={(e) => e.target.select()} maxLength={100} />
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t.dialogs.cancel}
        </Button>
        <Button type="submit" disabled={!value.trim()}>
          {t.dialogs.save}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DeleteDialog({
  title,
  open,
  onOpenChange,
  onConfirm,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl">{t.dialogs.deleteTitle(title)}</AlertDialogTitle>
          <AlertDialogDescription>{t.dialogs.deleteBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.dialogs.cancel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {t.dialogs.deleteConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PasteOutlineDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (markdown: string, fallbackTitle: string) => void;
}) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onCreate(text, title.trim() || t.dialogs.pasteDefaultTitle);
    setText("");
    setTitle("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t.dialogs.pasteTitle}</DialogTitle>
            <DialogDescription>{t.dialogs.pasteBody}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.dialogs.pastePlaceholder}
            className="max-h-[50dvh] min-h-52 font-mono text-[13px] leading-relaxed"
            autoFocus
            aria-label={t.dialogs.pasteTitle}
          />
          <label className="grid gap-1.5 text-sm font-medium">
            <span className="text-muted-foreground">{t.dialogs.pasteTitleLabel}</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.dialogs.pasteDefaultTitle} maxLength={100} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.dialogs.cancel}
            </Button>
            <Button type="submit" disabled={!text.trim()}>
              {t.dialogs.pasteCreate}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
