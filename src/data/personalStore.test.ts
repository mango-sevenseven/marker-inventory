import { describe, expect, it } from "vitest";
import type { Item } from "@/types/personalInventory";
import { createPersonalStore, PERSONAL_STORAGE_KEY } from "./personalStore";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

const draft: Item = {
  id: "test01",
  name: "测试物品",
  category: "电子产品",
  brand: "",
  model: "",
  color: "",
  material: "",
  composition: "",
  season: "",
  price: null,
  startedAt: "",
  endedAt: "",
  dailyUse: "",
  useCount: 0,
  notes: "",
  createdAt: "2026-08-15T00:00:00.000Z",
  updatedAt: "2026-08-15T00:00:00.000Z",
};

describe("personal inventory store", () => {
  it("can adjust several item usage counts without going below zero", () => {
    const store = createPersonalStore(new MemoryStorage());
    const [first, second] = store.getSnapshot().items;
    store.updateItem(first.id, { useCount: 2 });

    store.adjustItemUseCounts({ [first.id]: -1, [second.id]: 2 });

    expect(store.getSnapshot().items.find((item) => item.id === first.id)?.useCount).toBe(1);
    expect(store.getSnapshot().items.find((item) => item.id === second.id)?.useCount).toBe(2);
  });

  it("loads seed items only when personal storage is absent", () => {
    const storage = new MemoryStorage();
    const first = createPersonalStore(storage);
    expect(first.getSnapshot().items.some((entry) => entry.id === "electronic02")).toBe(true);
    first.addItem(draft);
    const second = createPersonalStore(storage);
    expect(second.getSnapshot().items.some((entry) => entry.id === "test01")).toBe(true);
  });

  it("records use and imports duplicate ids atomically", () => {
    const store = createPersonalStore(new MemoryStorage());
    const before = store.getSnapshot().items.find((entry) => entry.id === "electronic02")!;
    store.recordItemUse(before.id);
    expect(store.getSnapshot().items.find((entry) => entry.id === before.id)?.useCount).toBe(before.useCount + 1);

    const result = store.importItems([{ ...draft, id: before.id, name: "更新手机" }, draft], "update");
    expect(result).toEqual({ added: 1, updated: 1, skipped: 0, failed: 0 });
    expect(store.getSnapshot().items.find((entry) => entry.id === before.id)?.name).toBe("更新手机");
  });

  it("records daily usage idempotently and updates item use counts", () => {
    const store = createPersonalStore(new MemoryStorage());
    const phone = store.getSnapshot().items.find((entry) => entry.id === "electronic02")!;

    store.setDailyUsage("2026-08-16", [phone.id]);
    expect(store.getSnapshot().items.find((entry) => entry.id === phone.id)?.useCount).toBe(phone.useCount + 1);
    expect(store.getSnapshot().dailyUsageRecords).toEqual([{ date: "2026-08-16", itemIds: [phone.id] }]);

    store.setDailyUsage("2026-08-16", [phone.id]);
    expect(store.getSnapshot().items.find((entry) => entry.id === phone.id)?.useCount).toBe(phone.useCount + 1);

    store.setDailyUsage("2026-08-16", []);
    expect(store.getSnapshot().items.find((entry) => entry.id === phone.id)?.useCount).toBe(phone.useCount);
    expect(store.getSnapshot().dailyUsageRecords).toEqual([]);
  });

  it("manages base attributes, categories, and category-specific attributes", () => {
    const store = createPersonalStore(new MemoryStorage());
    store.addBaseAttribute({ id: "warranty", name: "保修期", type: "date" });
    store.updateBaseAttribute("warranty", { name: "保修截止日", type: "date" });
    expect(store.getSnapshot().baseAttributes.some((entry) => entry.name === "保修截止日")).toBe(true);

    store.addCategory({ id: "books", name: "图书", attributes: [] });
    store.addCategoryAttribute("books", { id: "isbn", name: "ISBN", type: "text" });
    store.updateCategory("books", "书籍");
    expect(store.getSnapshot().categories.find((entry) => entry.id === "books")).toMatchObject({
      name: "书籍",
      attributes: [{ id: "isbn", name: "ISBN", type: "text" }],
    });

    store.removeCategoryAttribute("books", "isbn");
    store.removeCategory("books");
    store.removeBaseAttribute("warranty");
    expect(store.getSnapshot().categories.some((entry) => entry.id === "books")).toBe(false);
    expect(store.getSnapshot().baseAttributes.some((entry) => entry.id === "warranty")).toBe(false);
  });

  it("migrates existing local data with default attribute definitions", () => {
    const storage = new MemoryStorage();
    storage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify({
      version: 1,
      items: [draft],
      categories: [{ id: "electronics", name: "电子产品" }],
      purchases: [],
      wishlist: [],
    }));

    const snapshot = createPersonalStore(storage).getSnapshot();
    expect(snapshot.baseAttributes.some((entry) => entry.itemKey === "name")).toBe(true);
    expect(snapshot.baseAttributes.some((entry) => entry.itemKey === "dailyUse")).toBe(true);
    expect(snapshot.categories[0].attributes).toEqual([]);
    expect(snapshot.items[0].customValues).toEqual({});
    expect(snapshot.dailyUsageRecords).toEqual([]);
  });
});
