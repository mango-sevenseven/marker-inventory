export interface Item {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  color: string;
  material: string;
  composition: string;
  season: string;
  price: number | null;
  startedAt: string;
  endedAt: string;
  dailyUse: string;
  useCount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  customValues?: Record<string, string>;
}

export type AttributeType = "text" | "number" | "date" | "textarea" | "select";

export type ItemFieldKey = "name" | "brand" | "model" | "color" | "material" | "composition" | "season" | "price" | "startedAt" | "endedAt" | "dailyUse" | "notes";

export interface AttributeDefinition {
  id: string;
  name: string;
  type: AttributeType;
  options?: string[];
  itemKey?: ItemFieldKey;
}

export interface ItemMetrics {
  holdingDays: number | null;
  usageFrequencyDays: number | null;
  costPerUse: number | null;
}

export interface ItemFilter {
  name: string;
  category: string;
}

export interface DailyUsageRecord {
  date: string;
  itemIds: string[];
}

export interface Category {
  id: string;
  name: string;
  attributes: AttributeDefinition[];
}

export interface PurchaseRecord {
  id: string;
  itemId: string;
  date: string;
  amount: number;
  note: string;
}

export interface WishItem {
  id: string;
  name: string;
  category: string;
  budget: number | null;
  priority: "high" | "medium" | "low";
}

export type DuplicateStrategy = "skip" | "update";

export interface ImportSummary {
  added: number;
  updated: number;
  skipped: number;
  failed: number;
}
