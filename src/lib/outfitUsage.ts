import type { PersonalStore } from "@/data/personalStore";

export function syncOutfitItemUsage(store: PersonalStore, previousItemIds: string[], nextItemIds: string[]) {
  const previous = new Set(previousItemIds);
  const next = new Set(nextItemIds);
  const deltas: Record<string, number> = {};
  previous.forEach((id) => { if (!next.has(id)) deltas[id] = -1; });
  next.forEach((id) => { if (!previous.has(id)) deltas[id] = 1; });
  store.adjustItemUseCounts(deltas);
}
