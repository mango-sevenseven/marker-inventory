import type { Item, ItemFilter } from "@/types/personalInventory";

export function isItemIncomplete(item: Item): boolean {
  return !item.name.trim() || !item.category.trim() || item.price === null || !item.startedAt;
}

export function filterItems(items: Item[], filter: ItemFilter): Item[] {
  const name = filter.name.trim().toLocaleLowerCase("zh-CN");
  return items.filter((item) => {
    if (filter.category && item.category !== filter.category) return false;
    if (!name) return true;
    return item.name.toLocaleLowerCase("zh-CN").includes(name);
  });
}
