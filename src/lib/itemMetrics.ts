import type { Item, ItemMetrics } from "@/types/personalInventory";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getLocalTodayIso(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateItemMetrics(item: Item, today = getLocalTodayIso()): ItemMetrics {
  const start = parseIsoDay(item.startedAt);
  const end = parseIsoDay(item.endedAt || today);
  const holdingDays = start === null || end === null ? null : Math.max(0, Math.round((end - start) / DAY_MS));
  const hasUses = Number.isFinite(item.useCount) && item.useCount > 0;

  return {
    holdingDays,
    usageFrequencyDays: holdingDays === null || !hasUses ? null : holdingDays / item.useCount,
    costPerUse: item.price === null || !hasUses ? null : item.price / item.useCount,
  };
}

export function calculateDailyExpense(items: Item[], today = getLocalTodayIso()): number {
  return items.reduce((total, item) => {
    const isActive = item.endedAt === "" || item.endedAt > today;
    const hasStarted = item.startedAt !== "" && item.startedAt <= today;
    if (!isActive || !hasStarted || item.price === null || item.price < 0) return total;
    const { holdingDays } = calculateItemMetrics({ ...item, endedAt: "" }, today);
    if (holdingDays === null) return total;
    return total + item.price / Math.max(1, holdingDays);
  }, 0);
}
