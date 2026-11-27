"use client";

import type { ColorSchemeValue } from "@ui-sdk/core";
import { usePreference } from "@ui-sdk/react/preferences";
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import { colorScheme } from "./color-scheme.ts";

const OPTIONS: { value: ColorSchemeValue; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

export function ThemeSwitcher() {
  const { value } = usePreference(colorScheme);

  return (
    <SegmentedControl
      aria-label="Tema"
      value={value}
      onValueChange={(next, details) => {
        const option = OPTIONS.find((o) => o.value === next);
        if (option) colorScheme.set(option.value, { event: details.event });
      }}
    >
      <SegmentedControlIndicator />
      {OPTIONS.map((option) => (
        <SegmentedControlItem key={option.value} value={option.value}>
          {option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
