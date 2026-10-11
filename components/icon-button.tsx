"use client";

import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = Omit<ComponentProps<typeof Button>, "children"> & {
  label: string;
  /** Short visible label next to the icon, for actions that must be obvious without hovering. */
  text?: string;
  keys?: string[];
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
};

/** Icon-only button with an accessible name and a tooltip that teaches its shortcut. */
export function IconButton({ label, text, keys, children, side = "bottom", variant = "ghost", size, ...props }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant={variant} size={size ?? (text ? "default" : "icon")} aria-label={label} {...props} />}
      >
        {children}
        {text && <span aria-hidden>{text}</span>}
      </TooltipTrigger>
      <TooltipContent side={side} className="flex items-center gap-2">
        <span>{label}</span>
        {keys && (
          <KbdGroup>
            {keys.map((k) => (
              <Kbd key={k}>{k}</Kbd>
            ))}
          </KbdGroup>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
