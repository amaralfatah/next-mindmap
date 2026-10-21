"use client";

import { createContext, useContext } from "react";

/** True inside the no-sign-in demo, where the map lives only in this tab and is never saved. */
export const DemoContext = createContext(false);

export function useIsDemo(): boolean {
  return useContext(DemoContext);
}
