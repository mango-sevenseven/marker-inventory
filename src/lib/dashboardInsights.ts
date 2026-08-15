import { calculateItemMetrics, getLocalTodayIso } from "@/lib/itemMetrics";
import type { Item, ItemMetrics } from "@/types/personalInventory";

export interface ItemInsight {
  item: Item;
  metrics: ItemMetrics;
}

export interface ExpiringItemInsight extends ItemInsight {
  daysRemaining: number;
}

export interface DashboardInsights {
  recentPurchases: ItemInsight[];
  bestValue: ItemInsight | null;
  worstValue: ItemInsight | null;
  longestOwned: ItemInsight[];
  expiringSoon: ExpiringItemInsight[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_USE_VALUES = new Set(["是", "每天", "每日", "yes", "true", "1"]);

export function calculateDashboardInsights(
  items: Item[],
  today = getLocalTodayIso(),
  expirationLimit = 5,
  recentPurchaseLimit = 5,
  longestOwnedLimit = 5,
  resolveDailyUse = (item: Item) => DAILY_USE_VALUES.has(item.dailyUse.trim().toLowerCase()),
): DashboardInsights {
  const recentPurchases: ItemInsight[] = [];
  let bestValue: ItemInsight | null = null;
  let worstValue: ItemInsight | null = null;
  const longestOwned: ItemInsight[] = [];
  const expiringSoon: ExpiringItemInsight[] = [];
  const todayTimestamp = Date.parse(`${today}T00:00:00.000Z`);

  items.forEach((item) => {
    const dateMetrics = calculateItemMetrics(item, today);
    const isDailyUse = resolveDailyUse(item);
    const useCount = isDailyUse && dateMetrics.holdingDays !== null ? dateMetrics.holdingDays : item.useCount;
    const metrics = calculateItemMetrics({ ...item, useCount }, today);
    const insight = { item, metrics };

    if (/^\d{4}-\d{2}-\d{2}$/.test(item.startedAt)) recentPurchases.push(insight);
    if (metrics.costPerUse !== null) {
      if (!bestValue || metrics.costPerUse < bestValue.metrics.costPerUse!) bestValue = insight;
      if (!worstValue || metrics.costPerUse > worstValue.metrics.costPerUse!) worstValue = insight;
    }
    if (metrics.holdingDays !== null) longestOwned.push(insight);

    if (/^\d{4}-\d{2}-\d{2}$/.test(item.endedAt)) {
      const endTimestamp = Date.parse(`${item.endedAt}T00:00:00.000Z`);
      const daysRemaining = Math.round((endTimestamp - todayTimestamp) / DAY_MS);
      if (Number.isFinite(daysRemaining) && daysRemaining >= 0 && daysRemaining < 15) {
        expiringSoon.push({ ...insight, daysRemaining });
      }
    }
  });

  const limitedExpiringSoon = expiringSoon
    .sort((left, right) => left.daysRemaining - right.daysRemaining)
    .slice(0, Math.max(0, expirationLimit));
  const limitedRecentPurchases = recentPurchases
    .sort((left, right) => right.item.startedAt.localeCompare(left.item.startedAt) || right.item.createdAt.localeCompare(left.item.createdAt))
    .slice(0, Math.max(0, recentPurchaseLimit));
  const limitedLongestOwned = longestOwned
    .sort((left, right) => right.metrics.holdingDays! - left.metrics.holdingDays! || left.item.name.localeCompare(right.item.name, "zh-CN"))
    .slice(0, Math.max(0, longestOwnedLimit));

  return { recentPurchases: limitedRecentPurchases, bestValue, worstValue, longestOwned: limitedLongestOwned, expiringSoon: limitedExpiringSoon };
}
