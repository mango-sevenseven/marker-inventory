import { useCallback, useSyncExternalStore } from "react";
import type { ColorSwatch } from "@/types";
import { colorSwatchesStore } from "@/data/colorSwatchesStore";

export function useColorSwatches() {
  const swatches = useSyncExternalStore(
    colorSwatchesStore.subscribe,
    colorSwatchesStore.getSnapshot,
    colorSwatchesStore.getSnapshot,
  );

  const save = useCallback((next: ColorSwatch[][]) => {
    colorSwatchesStore.replaceSnapshot(next);
  }, []);

  return { swatches, save };
}
