import { ReadonlySignal, signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import type { Theme } from "@tauri-apps/api/window";
import { useListenSignal } from "./use-listen-signal.ts";

const DEFAULT_THEME: Theme = "light";

function themeBrowser(): ReadonlySignal<Theme> {
  let darkMatch: MediaQueryList | undefined;
  if (typeof window !== "undefined" && Boolean(window.matchMedia)) {
    darkMatch = window.matchMedia("(prefers-color-scheme: dark)");
  } else {
    darkMatch = undefined;
  }
  if (darkMatch) {
    const currentTheme = darkMatch.matches ? "dark" : "light";
    const theme = signal<Theme>(currentTheme);
    const handler = (event: MediaQueryListEvent) => {
      if (event.matches) {
        theme.value = "dark";
      } else {
        theme.value = "light";
      }
    };
    darkMatch.addEventListener("change", handler);
    return theme;
  } else {
    return signal(DEFAULT_THEME);
  }
}

const $theme: ReadonlySignal<Theme> = themeBrowser();

export function useTheme(): Theme {
  useSignals();
  return useListenSignal($theme);
}
