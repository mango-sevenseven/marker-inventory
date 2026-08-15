import { describe, expect, it } from "vitest";
import type { Item } from "@/types/personalInventory";
import { calculateDashboardInsights } from "./dashboardInsights";

const item = (value: Partial<Item> & Pick<Item, "id" | "name">): Item => ({
  id: value.id,
  name: value.name,
  category: "测试",
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
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...value,
});

describe("calculateDashboardInsights", () => {
  it("selects value leaders", () => {
    const insights = calculateDashboardInsights([
      item({ id: "a", name: "每日低成本", price: 100, dailyUse: "是", useCount: 0, startedAt: "2026-08-05", createdAt: "2026-07-01T00:00:00.000Z" }),
      item({ id: "b", name: "每日高成本", price: 600, dailyUse: "是", useCount: 0, startedAt: "2026-08-13", createdAt: "2026-08-01T00:00:00.000Z" }),
    ], "2026-08-15");

    expect(insights.bestValue?.item.id).toBe("a");
    expect(insights.bestValue?.metrics.costPerUse).toBe(10);
    expect(insights.worstValue?.item.id).toBe("b");
    expect(insights.worstValue?.metrics.costPerUse).toBe(300);
  });

  it("lists up to five longest-owned items by holding days descending", () => {
    const insights = calculateDashboardInsights([
      item({ id: "missing", name: "缺少日期" }),
      item({ id: "oldest", name: "最久", startedAt: "2020-01-01" }),
      item({ id: "second", name: "第二久", startedAt: "2021-01-01" }),
      item({ id: "third", name: "第三久", startedAt: "2022-01-01" }),
      item({ id: "fourth", name: "第四久", startedAt: "2023-01-01" }),
      item({ id: "fifth", name: "第五久", startedAt: "2024-01-01" }),
      item({ id: "sixth", name: "第六久", startedAt: "2025-01-01" }),
    ], "2026-08-15");

    expect(insights.longestOwned.map(({ item: ownedItem }) => ownedItem.id)).toEqual([
      "oldest",
      "second",
      "third",
      "fourth",
      "fifth",
    ]);
    expect(insights.longestOwned.map(({ metrics }) => metrics.holdingDays)).toEqual([
      2418,
      2052,
      1687,
      1322,
      957,
    ]);
  });

  it("lists up to five recently purchased items by purchase date descending", () => {
    const insights = calculateDashboardInsights([
      item({ id: "missing", name: "缺少日期" }),
      item({ id: "old", name: "较早购入", startedAt: "2020-01-01" }),
      item({ id: "p3", name: "第三", startedAt: "2026-06-03" }),
      item({ id: "p1", name: "第一", startedAt: "2026-08-12" }),
      item({ id: "p5", name: "第五", startedAt: "2026-04-01" }),
      item({ id: "p2", name: "第二", startedAt: "2026-07-20" }),
      item({ id: "p4", name: "第四", startedAt: "2026-05-15" }),
    ], "2026-08-15");

    expect(insights.recentPurchases.map(({ item: purchasedItem }) => purchasedItem.id)).toEqual([
      "p1",
      "p2",
      "p3",
      "p4",
      "p5",
    ]);
    expect(insights.recentPurchases.map(({ item: purchasedItem }) => purchasedItem.startedAt)).toEqual([
      "2026-08-12",
      "2026-07-20",
      "2026-06-03",
      "2026-05-15",
      "2026-04-01",
    ]);
  });

  it("lists up to five items expiring in under 15 days in ascending order", () => {
    const insights = calculateDashboardInsights([
      item({ id: "past", name: "已结束", endedAt: "2026-08-14" }),
      item({ id: "day-15", name: "十五天后", endedAt: "2026-08-30" }),
      item({ id: "day-14", name: "十四天后", endedAt: "2026-08-29" }),
      item({ id: "day-10", name: "十天后", endedAt: "2026-08-25" }),
      item({ id: "day-7", name: "七天后", endedAt: "2026-08-22" }),
      item({ id: "day-5", name: "五天后", endedAt: "2026-08-20" }),
      item({ id: "day-3", name: "三天后", endedAt: "2026-08-18" }),
      item({ id: "day-1", name: "一天后", endedAt: "2026-08-16" }),
      item({ id: "today", name: "今天到期", endedAt: "2026-08-15" }),
    ], "2026-08-15");

    expect(insights.expiringSoon.map(({ item: expiringItem }) => expiringItem.id)).toEqual([
      "today",
      "day-1",
      "day-3",
      "day-5",
      "day-7",
    ]);
    expect(insights.expiringSoon.map(({ daysRemaining }) => daysRemaining)).toEqual([0, 1, 3, 5, 7]);
  });

  it("returns empty insights when required data is missing", () => {
    const insights = calculateDashboardInsights([item({ id: "empty", name: "信息不足" })], "2026-08-15");

    expect(insights.recentPurchases).toEqual([]);
    expect(insights.longestOwned).toEqual([]);
    expect(insights.bestValue).toBeNull();
    expect(insights.worstValue).toBeNull();
    expect(insights.expiringSoon).toEqual([]);
  });
});
