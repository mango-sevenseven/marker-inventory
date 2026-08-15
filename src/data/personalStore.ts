import { personalBaseAttributes, personalCategories, personalItemsSeed } from "@/data/mock/personalItems";
import type { AttributeDefinition, Category, DailyUsageRecord, DuplicateStrategy, ImportSummary, Item, PurchaseRecord, WishItem } from "@/types/personalInventory";

export const PERSONAL_STORAGE_KEY = "personal_inventory_store_v1";

export interface PersonalStoreSnapshot {
  version: 1;
  items: Item[];
  categories: Category[];
  baseAttributes: AttributeDefinition[];
  dailyUsageRecords: DailyUsageRecord[];
  purchases: PurchaseRecord[];
  wishlist: WishItem[];
}

const initialSnapshot = (): PersonalStoreSnapshot => ({
  version: 1,
  items: personalItemsSeed.map((entry) => ({ ...entry })),
  categories: personalCategories.map((entry) => ({ ...entry })),
  baseAttributes: personalBaseAttributes.map((entry) => ({ ...entry })),
  dailyUsageRecords: [],
  purchases: [],
  wishlist: [],
});

function load(storage?: Storage): PersonalStoreSnapshot {
  if (!storage) return initialSnapshot();
  try {
    const raw = storage.getItem(PERSONAL_STORAGE_KEY);
    if (!raw) return initialSnapshot();
    const parsed = JSON.parse(raw) as PersonalStoreSnapshot;
    if (parsed.version !== 1 || !Array.isArray(parsed.items) || !Array.isArray(parsed.categories)) return initialSnapshot();
    const fallback = initialSnapshot();
    const loadedBaseAttributes = Array.isArray(parsed.baseAttributes) ? parsed.baseAttributes : fallback.baseAttributes;
    const dailyUseAttribute = fallback.baseAttributes.find((attribute) => attribute.itemKey === "dailyUse")!;
    const baseAttributes = loadedBaseAttributes.some((attribute) => attribute.itemKey === "dailyUse" || attribute.name.trim() === "是否每天使用")
      ? loadedBaseAttributes
      : [...loadedBaseAttributes, dailyUseAttribute];
    return {
      ...fallback,
      ...parsed,
      items: parsed.items.map((item) => ({ ...item, dailyUse: item.dailyUse ?? "", customValues: item.customValues ?? {} })),
      categories: parsed.categories.map((category) => ({ ...category, attributes: category.attributes ?? [] })),
      baseAttributes,
      dailyUsageRecords: Array.isArray(parsed.dailyUsageRecords)
        ? parsed.dailyUsageRecords.map((record) => ({ date: record.date, itemIds: Array.isArray(record.itemIds) ? record.itemIds : [] }))
        : [],
    };
  } catch {
    return initialSnapshot();
  }
}

export function createPersonalStore(storage?: Storage) {
  let snapshot = load(storage);
  const listeners = new Set<() => void>();
  const publish = (next: PersonalStoreSnapshot) => {
    snapshot = next;
    storage?.setItem(PERSONAL_STORAGE_KEY, JSON.stringify(snapshot));
    listeners.forEach((listener) => listener());
  };
  const updateItems = (items: Item[]) => publish({ ...snapshot, items });
  const ensureUniqueName = (name: string, names: string[], message: string) => {
    if (!name.trim()) throw new Error("名称不能为空");
    if (names.some((entry) => entry === name.trim())) throw new Error(message);
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    addItem(item: Item) {
      if (snapshot.items.some((entry) => entry.id === item.id)) throw new Error("物品编号已存在");
      updateItems([...snapshot.items, item]);
    },
    updateItem(id: string, patch: Partial<Item>) {
      const now = new Date().toISOString();
      updateItems(snapshot.items.map((entry) => entry.id === id ? { ...entry, ...patch, id, updatedAt: now } : entry));
    },
    removeItem(id: string) {
      publish({
        ...snapshot,
        items: snapshot.items.filter((entry) => entry.id !== id),
        dailyUsageRecords: snapshot.dailyUsageRecords.map((record) => ({ ...record, itemIds: record.itemIds.filter((itemId) => itemId !== id) })),
      });
    },
    addBaseAttribute(attribute: AttributeDefinition) {
      ensureUniqueName(attribute.name, snapshot.baseAttributes.map((entry) => entry.name), "基础属性名称已存在");
      publish({ ...snapshot, baseAttributes: [...snapshot.baseAttributes, { ...attribute, name: attribute.name.trim() }] });
    },
    updateBaseAttribute(id: string, patch: Pick<AttributeDefinition, "name" | "type" | "options">) {
      ensureUniqueName(patch.name, snapshot.baseAttributes.filter((entry) => entry.id !== id).map((entry) => entry.name), "基础属性名称已存在");
      publish({ ...snapshot, baseAttributes: snapshot.baseAttributes.map((entry) => entry.id === id ? { ...entry, ...patch, name: patch.name.trim() } : entry) });
    },
    removeBaseAttribute(id: string) {
      publish({ ...snapshot, baseAttributes: snapshot.baseAttributes.filter((entry) => entry.id !== id) });
    },
    addCategory(category: Category) {
      ensureUniqueName(category.name, snapshot.categories.map((entry) => entry.name), "类别名称已存在");
      publish({ ...snapshot, categories: [...snapshot.categories, { ...category, name: category.name.trim(), attributes: category.attributes ?? [] }] });
    },
    updateCategory(id: string, name: string) {
      const current = snapshot.categories.find((entry) => entry.id === id);
      if (!current) return;
      ensureUniqueName(name, snapshot.categories.filter((entry) => entry.id !== id).map((entry) => entry.name), "类别名称已存在");
      const nextName = name.trim();
      publish({
        ...snapshot,
        categories: snapshot.categories.map((entry) => entry.id === id ? { ...entry, name: nextName } : entry),
        items: snapshot.items.map((entry) => entry.category === current.name ? { ...entry, category: nextName } : entry),
      });
    },
    removeCategory(id: string) {
      const current = snapshot.categories.find((entry) => entry.id === id);
      if (!current) return;
      if (snapshot.items.some((entry) => entry.category === current.name)) throw new Error("该类别下仍有物品，暂不能删除");
      publish({ ...snapshot, categories: snapshot.categories.filter((entry) => entry.id !== id) });
    },
    addCategoryAttribute(categoryId: string, attribute: AttributeDefinition) {
      const category = snapshot.categories.find((entry) => entry.id === categoryId);
      if (!category) return;
      ensureUniqueName(attribute.name, category.attributes.map((entry) => entry.name), "该类别下的属性名称已存在");
      publish({ ...snapshot, categories: snapshot.categories.map((entry) => entry.id === categoryId ? { ...entry, attributes: [...entry.attributes, { ...attribute, name: attribute.name.trim() }] } : entry) });
    },
    updateCategoryAttribute(categoryId: string, attributeId: string, patch: Pick<AttributeDefinition, "name" | "type" | "options">) {
      const category = snapshot.categories.find((entry) => entry.id === categoryId);
      if (!category) return;
      ensureUniqueName(patch.name, category.attributes.filter((entry) => entry.id !== attributeId).map((entry) => entry.name), "该类别下的属性名称已存在");
      publish({ ...snapshot, categories: snapshot.categories.map((entry) => entry.id === categoryId ? { ...entry, attributes: entry.attributes.map((attribute) => attribute.id === attributeId ? { ...attribute, ...patch, name: patch.name.trim() } : attribute) } : entry) });
    },
    removeCategoryAttribute(categoryId: string, attributeId: string) {
      publish({ ...snapshot, categories: snapshot.categories.map((entry) => entry.id === categoryId ? { ...entry, attributes: entry.attributes.filter((attribute) => attribute.id !== attributeId) } : entry) });
    },
    recordItemUse(id: string) {
      const now = new Date().toISOString();
      updateItems(snapshot.items.map((entry) => entry.id === id ? { ...entry, useCount: entry.useCount + 1, updatedAt: now } : entry));
    },
    setDailyUsage(date: string, itemIds: string[]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("日期格式不正确");
      const validIds = new Set(snapshot.items.map((item) => item.id));
      const nextIds = [...new Set(itemIds.filter((id) => validIds.has(id)))];
      const previous = snapshot.dailyUsageRecords.find((record) => record.date === date);
      const previousIds = new Set(previous?.itemIds ?? []);
      const nextIdSet = new Set(nextIds);
      const now = new Date().toISOString();
      const items = snapshot.items.map((item) => {
        const wasRecorded = previousIds.has(item.id);
        const isRecorded = nextIdSet.has(item.id);
        if (wasRecorded === isRecorded) return item;
        return {
          ...item,
          useCount: Math.max(0, item.useCount + (isRecorded ? 1 : -1)),
          updatedAt: now,
        };
      });
      const remainingRecords = snapshot.dailyUsageRecords.filter((record) => record.date !== date);
      const dailyUsageRecords = nextIds.length > 0
        ? [...remainingRecords, { date, itemIds: nextIds }]
        : remainingRecords;
      publish({ ...snapshot, items, dailyUsageRecords });
    },
    importItems(items: Item[], strategy: DuplicateStrategy): ImportSummary {
      const byId = new Map(snapshot.items.map((entry) => [entry.id, entry]));
      let added = 0;
      let updated = 0;
      let skipped = 0;
      items.forEach((entry) => {
        if (!byId.has(entry.id)) {
          byId.set(entry.id, entry);
          added += 1;
        } else if (strategy === "update") {
          byId.set(entry.id, { ...byId.get(entry.id)!, ...entry, updatedAt: new Date().toISOString() });
          updated += 1;
        } else {
          skipped += 1;
        }
      });
      updateItems([...byId.values()]);
      return { added, updated, skipped, failed: 0 };
    },
    replaceSnapshot(next: PersonalStoreSnapshot) {
      publish(next);
    },
    reset() {
      publish(initialSnapshot());
    },
  };
}

export type PersonalStore = ReturnType<typeof createPersonalStore>;

const browserStorage = typeof window === "undefined" ? undefined : window.localStorage;
export const personalStore = createPersonalStore(browserStorage);
