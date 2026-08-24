import { mockColorSwatches } from "@/data/mock/colorSwatches";
import type { ColorSwatch } from "@/types";

export const COLOR_SWATCH_STORAGE_KEY = "marker_inventory_swatches_v1";
export type ColorSwatchSnapshot = ColorSwatch[][];

function createDefaultSnapshot(): ColorSwatchSnapshot {
  return mockColorSwatches.map((row) => row.map((swatch) => ({ ...swatch })));
}

function loadSnapshot(): ColorSwatchSnapshot {
  if (typeof window === "undefined") return createDefaultSnapshot();
  try {
    const raw = window.localStorage.getItem(COLOR_SWATCH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ColorSwatchSnapshot;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Use defaults when browser storage is unavailable or invalid.
  }
  return createDefaultSnapshot();
}

let snapshot = loadSnapshot();
const listeners = new Set<() => void>();

function replaceSnapshot(next: ColorSwatchSnapshot) {
  snapshot = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(COLOR_SWATCH_STORAGE_KEY, JSON.stringify(next));
  }
  listeners.forEach((listener) => listener());
}

export const colorSwatchesStore = {
  getSnapshot: () => snapshot,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  replaceSnapshot,
};
