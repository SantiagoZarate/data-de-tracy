"use client";

import { Preferences } from "@ui-sdk/react/preferences";
import type { ReactNode } from "react";
import { colorScheme } from "./color-scheme.ts";

export function AppPreferences({ children }: { children: ReactNode }) {
  return (
    <Preferences preferences={[colorScheme]} className="flex min-h-full flex-1 flex-col">
      {children}
    </Preferences>
  );
}
