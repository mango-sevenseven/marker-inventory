import { describe, expect, it } from "vitest";
import type { Item } from "@/types/personalInventory";
import { filterItems, isItemIncomplete } from "./itemFilters";

const item = (patch: Partial<Item>): Item => ({
  id: "electronic02",
  name: "手机",
  category: "电子产品",
  brand: "Apple",
  model: "iPhone 14 256G",
  color: "黑色",
  material: "",
  composition: "",
  season: "",
  price: 6300,
  startedAt: "2022-11-11",
  endedAt: "",
  dailyUse: "",
  useCount: 10,
  notes: "",
  createdAt: "2022-11-11T00:00:00.000Z",
  updatedAt: "2022-11-11T00:00:00.000Z",
  ...patch,
});

const items = [
  item({}),
  item({ id: "clothes01", name: "灰色针织短袖", category: "衣服", brand: "麦檬", model: "" }),
  item({ id: "cat01", name: "自动喂食器", category: "宠物用品", brand: "", model: "PET-FEEDER", price: null }),
];

describe("item filters", () => {
  it("searches only by item name", () => {
    expect(filterItems(items, { name: "手机", category: "" })).toEqual([items[0]]);
    expect(filterItems(items, { name: "apple", category: "" })).toHaveLength(0);
    expect(filterItems(items, { name: "CLOTHES01", category: "" })).toHaveLength(0);
  });

  it("combines name and category filters", () => {
    expect(filterItems(items, { name: "喂食器", category: "宠物用品" })).toEqual([items[2]]);
    expect(filterItems(items, { name: "喂食器", category: "衣服" })).toHaveLength(0);
  });

  it("treats missing price or start date as incomplete", () => {
    expect(isItemIncomplete(items[0])).toBe(false);
    expect(isItemIncomplete({ ...items[0], price: null })).toBe(true);
    expect(isItemIncomplete({ ...items[0], startedAt: "" })).toBe(true);
  });
});
