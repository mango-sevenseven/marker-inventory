import type { AttributeDefinition, Category, Item } from "@/types/personalInventory";

const stamp = (date: string) => `${date || "2026-08-15"}T00:00:00.000Z`;

const item = (value: Partial<Item> & Pick<Item, "id" | "name" | "category">): Item => ({
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
  createdAt: stamp(value.startedAt ?? ""),
  updatedAt: stamp(value.startedAt ?? ""),
  ...value,
});

export const personalBaseAttributes: AttributeDefinition[] = [
  { id: "base-name", name: "物品名称", type: "text", itemKey: "name" },
  { id: "base-brand", name: "品牌", type: "text", itemKey: "brand" },
  { id: "base-model", name: "型号", type: "text", itemKey: "model" },
  { id: "base-color", name: "颜色", type: "text", itemKey: "color" },
  { id: "base-material", name: "材质", type: "text", itemKey: "material" },
  { id: "base-composition", name: "成分", type: "text", itemKey: "composition" },
  { id: "base-season", name: "季节", type: "text", itemKey: "season" },
  { id: "base-price", name: "价格", type: "number", itemKey: "price" },
  { id: "base-started-at", name: "开始时间", type: "date", itemKey: "startedAt" },
  { id: "base-ended-at", name: "截止时间", type: "date", itemKey: "endedAt" },
  { id: "base-daily-use", name: "是否每天使用", type: "select", options: ["是", "否"], itemKey: "dailyUse" },
  { id: "base-notes", name: "备注", type: "textarea", itemKey: "notes" },
];

export const personalCategories: Category[] = [
  { id: "electronics", name: "电子产品", attributes: [] },
  { id: "clothes", name: "衣服", attributes: [] },
  { id: "pet-supplies", name: "宠物用品", attributes: [] },
];

export const personalItemsSeed: Item[] = [
  item({ id: "electronic01", name: "手机", category: "电子产品" }),
  item({ id: "electronic02", name: "手机", category: "电子产品", model: "apple14-256g", price: 6300, startedAt: "2022-11-11" }),
  item({ id: "electronic03", name: "手表", category: "电子产品", model: "applewatch-se", price: 1980, startedAt: "2023-06-01" }),
  item({ id: "electronic04", name: "平板", category: "电子产品" }),
  item({ id: "electronic05", name: "键盘", category: "电子产品" }),
  item({ id: "electronic06", name: "鼠标", category: "电子产品" }),
  item({ id: "clothes01", name: "灰色针织短袖", category: "衣服", brand: "麦檬", color: "灰色", material: "针织", season: "夏" }),
  item({ id: "clothes02", name: "未命名半身裙", category: "衣服" }),
  item({ id: "clothes03", name: "未命名连衣裙", category: "衣服" }),
  item({ id: "clothes04", name: "防晒衣", category: "衣服", brand: "蕉下", season: "春、夏、秋", price: 139, startedAt: "2026-08-10" }),
  item({ id: "clothes05", name: "黑色长裤", category: "衣服", brand: "诗凡黎", season: "夏", price: 259, startedAt: "2024-06-28" }),
  item({ id: "clothes06", name: "未命名短裤", category: "衣服" }),
  item({ id: "clothes07", name: "黑色登山鞋", category: "衣服", brand: "斯凯奇", color: "黑色", season: "春、夏、秋、冬" }),
  item({ id: "cat01", name: "自动喂食器", category: "宠物用品" }),
  item({ id: "cat02", name: "自动喂食器", category: "宠物用品" }),
  item({ id: "cat03", name: "猫粮", category: "宠物用品" }),
  item({ id: "cat04", name: "猫砂", category: "宠物用品" }),
];
