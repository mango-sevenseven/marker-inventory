import { describe, expect, it } from "vitest";
import { createPersonalStore } from "@/data/personalStore";
import { syncOutfitItemUsage } from "./outfitUsage";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

describe("outfit usage sync", () => {
  it("increments newly worn items and rolls back removed items", () => {
    const store = createPersonalStore(new MemoryStorage());
    const [coat, pants, shoes] = store.getSnapshot().items;

    syncOutfitItemUsage(store, [], [coat.id, pants.id, pants.id]);
    syncOutfitItemUsage(store, [coat.id, pants.id], [coat.id, shoes.id]);

    expect(store.getSnapshot().items.find((item) => item.id === coat.id)?.useCount).toBe(1);
    expect(store.getSnapshot().items.find((item) => item.id === pants.id)?.useCount).toBe(0);
    expect(store.getSnapshot().items.find((item) => item.id === shoes.id)?.useCount).toBe(1);
  });
});
