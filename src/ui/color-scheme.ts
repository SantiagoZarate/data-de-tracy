import { createColorScheme, createLocalStorage } from "@ui-sdk/core";

export const colorScheme = createColorScheme({
  defaultValue: "light",
  storage: createLocalStorage("color-scheme"),
  global: true,
});
