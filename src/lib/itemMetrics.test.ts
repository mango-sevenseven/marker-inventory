import { describe, expect, it } from "vitest";
import type { Item } from "@/types/personalInventory";
import { calculateDailyExpense, calculateItemMetrics, getLocalTodayIso } from "./itemMetrics";

const baseItem: Item = {
  id: "electronic02",
  name: "手机",
  category: "电子产品",
  brand: "Apple",
  model: "iPhone 14 256G",
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

describe("calculateItemMetrics", () => {
  it("calculates holding days, average frequency, and cost per use", () => {
    expect(calculateItemMetrics(baseItem, "2022-11-21")).toEqual({
      holdingDays: 10,
      usageFrequencyDays: 1,
      costPerUse: 630,
    });
  });

  it("uses the explicit end date instead of today", () => {
    expect(
      calculateItemMetrics({ ...baseItem, endedAt: "2022-11-16" }, "2022-12-30"),
    ).toMatchObject({ holdingDays: 5, usageFrequencyDays: 0.5 });
  });

  it("returns unavailable derived values when start date or use count is missing", () => {
    expect(calculateItemMetrics({ ...baseItem, startedAt: "", useCount: 0 })).toEqual({
      holdingDays: null,
      usageFrequencyDays: null,
      costPerUse: null,
    });
  });

  it("never returns negative holding days", () => {
    expect(
      calculateItemMetrics({ ...baseItem, startedAt: "2022-11-20", endedAt: "2022-11-10" }),
    ).toMatchObject({ holdingDays: 0 });
  });
});

describe("calculateDailyExpense", () => {
  it("sums active item prices divided by their current usage days", () => {
    expect(calculateDailyExpense([
      { ...baseItem, id: "active", name: "使用中", price: 100, startedAt: "2026-08-06" },
      { ...baseItem, id: "today", name: "今日购入", price: 20, startedAt: "2026-08-16" },
      { ...baseItem, id: "ended", name: "已弃用", price: 1000, startedAt: "2026-08-01", endedAt: "2026-08-15" },
      { ...baseItem, id: "future", name: "尚未购入", price: 2000, startedAt: "2026-08-17" },
      { ...baseItem, id: "missing-date", name: "缺日期", price: 500, startedAt: "" },
    ], "2026-08-16")).toBe(30);
  });
});

describe("getLocalTodayIso", () => {
  it("formats the local calendar date instead of the UTC date", () => {
    expect(getLocalTodayIso(new Date(2026, 7, 16, 0, 30))).toBe("2026-08-16");
  });
});
