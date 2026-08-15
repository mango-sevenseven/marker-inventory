import { describe, expect, it } from "vitest";
import type { Item } from "@/types/personalInventory";
import { buildImportPlan, ITEM_CSV_HEADERS, parseItemsCsv, serializeItemsCsv } from "./itemsCsv";

const existing: Item = {
  id: "electronic02",
  name: "手机",
  category: "电子产品",
  brand: "Apple",
  model: "iPhone 14",
  color: "",
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
};

describe("items CSV", () => {
  it("parses BOM, quoted commas, escaped quotes, and embedded newlines", () => {
    const csv = '\uFEFF编号,名称,分类,是否每天使用,备注\r\nclothes12,"衬衫,白色",衣服,是,"第一行\n含""引号"""';
    const result = parseItemsCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]).toMatchObject({ id: "clothes12", name: "衬衫,白色", dailyUse: "是", notes: '第一行\n含"引号"' });
  });

  it("reports missing required headers and invalid numeric/date values", () => {
    const missing = parseItemsCsv("名称,分类\n手机,电子产品");
    expect(missing.errors[0].message).toContain("编号");

    const invalid = parseItemsCsv("编号,名称,分类,价格,开始时间,使用次数\na,手机,电子产品,-1,2026/01/01,1.5");
    expect(invalid.errors.map((issue) => issue.message).join(" ")).toMatch(/价格|日期|使用次数/);
  });

  it("builds skip and update plans for duplicate ids", () => {
    const parsed = parseItemsCsv("编号,名称,分类\nelectronic02,新手机,电子产品\nclothes99,新衬衫,衣服");
    expect(buildImportPlan(parsed.rows, [existing], "skip")).toMatchObject({ added: 1, updated: 0, skipped: 1 });
    expect(buildImportPlan(parsed.rows, [existing], "update")).toMatchObject({ added: 1, updated: 1, skipped: 0 });
  });

  it("exports BOM, fixed headers, escaped values, and fresh derived metrics", () => {
    const csv = serializeItemsCsv([{ ...existing, dailyUse: "是", notes: "贵,但常用" }], "2022-11-21");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.split("\r\n")[0].slice(1)).toBe(ITEM_CSV_HEADERS.join(","));
    expect(csv).toContain('"贵,但常用"');
    expect(csv).toContain(",是,10,");
    expect(csv).toContain('"贵,但常用",10,1,630');
  });
});
