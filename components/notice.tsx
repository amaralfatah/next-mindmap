import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Slim inline notice used for storage warnings, reminders and cross-tab changes. */
export function Notice({
  tone = "info",
  icon,
  children,
  actions,
  className,
}: {
  tone?: "info" | "warn";
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "warn" ? "alert" : "status"}
      className={cn(
        "rise flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2 text-sm shadow-sm",
        tone === "warn"
          ? "border-destructive/30 bg-[color-mix(in_oklch,var(--destructive)_10%,var(--background))]"
          : "bg-[color-mix(in_oklch,var(--branch-ochre)_14%,var(--background))]",
        className,
      )}
    >
      {icon && <span className="shrink-0 [&_svg]:size-4">{icon}</span>}
      <p className="min-w-0 flex-1 text-pretty">{children}</p>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}
