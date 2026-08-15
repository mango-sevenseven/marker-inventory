import { calculateItemMetrics } from "@/lib/itemMetrics";
import type { DuplicateStrategy, Item } from "@/types/personalInventory";

export const ITEM_CSV_HEADERS = [
  "编号", "名称", "分类", "品牌", "型号", "颜色", "材质", "成分", "季节", "价格",
  "开始时间", "截止时间", "是否每天使用", "使用次数", "备注", "持有天数", "平均使用频率（天/次）", "单次使用成本",
] as const;

type CsvIssue = { row: number; message: string };
export type CsvParseResult = { rows: Item[]; errors: CsvIssue[]; warnings: CsvIssue[] };

const FIELD_BY_HEADER: Record<string, keyof Item> = {
  编号: "id", 名称: "name", 分类: "category", 品牌: "brand", 型号: "model", 颜色: "color",
  材质: "material", 成分: "composition", 季节: "season", 价格: "price", 开始时间: "startedAt",
  截止时间: "endedAt", 是否每天使用: "dailyUse", 使用次数: "useCount", 备注: "notes",
};
const REQUIRED_HEADERS = ["编号", "名称", "分类"];
const DERIVED_HEADERS = new Set(["持有天数", "平均使用频率（天/次）", "单次使用成本"]);

function tokenizeCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function emptyItem(now: string): Item {
  return {
    id: "", name: "", category: "", brand: "", model: "", color: "", material: "",
    composition: "", season: "", price: null, startedAt: "", endedAt: "", dailyUse: "", useCount: 0,
    notes: "", createdAt: now, updatedAt: now,
  };
}

export function parseItemsCsv(text: string): CsvParseResult {
  const table = tokenizeCsv(text);
  const headers = table[0]?.map((header) => header.trim()) ?? [];
  const errors: CsvIssue[] = [];
  const warnings: CsvIssue[] = [];
  for (const header of REQUIRED_HEADERS) {
    if (!headers.includes(header)) errors.push({ row: 1, message: `缺少必填列：${header}` });
  }
  headers.forEach((header) => {
    if (!FIELD_BY_HEADER[header] && !DERIVED_HEADERS.has(header)) warnings.push({ row: 1, message: `忽略未知列：${header}` });
  });
  if (errors.length > 0) return { rows: [], errors, warnings };

  const rows: Item[] = [];
  const now = new Date().toISOString();
  table.slice(1).forEach((cells, rowIndex) => {
    if (cells.every((cell) => !cell.trim())) return;
    const result = emptyItem(now);
    headers.forEach((header, columnIndex) => {
      const key = FIELD_BY_HEADER[header];
      if (!key) return;
      const raw = cells[columnIndex]?.trim() ?? "";
      if (key === "price") result.price = raw === "" ? null : Number(raw);
      else if (key === "useCount") result.useCount = raw === "" ? 0 : Number(raw);
      else (result[key] as string) = raw;
    });
    const number = rowIndex + 2;
    const before = errors.length;
    if (!result.id) errors.push({ row: number, message: "编号不能为空" });
    if (!result.name) errors.push({ row: number, message: "名称不能为空" });
    if (!result.category) errors.push({ row: number, message: "分类不能为空" });
    if (result.price !== null && (!Number.isFinite(result.price) || result.price < 0)) errors.push({ row: number, message: "价格必须是非负数" });
    if (!Number.isInteger(result.useCount) || result.useCount < 0) errors.push({ row: number, message: "使用次数必须是非负整数" });
    if (result.startedAt && !validIsoDate(result.startedAt)) errors.push({ row: number, message: "开始时间必须是 YYYY-MM-DD 日期" });
    if (result.endedAt && !validIsoDate(result.endedAt)) errors.push({ row: number, message: "截止时间必须是 YYYY-MM-DD 日期" });
    if (errors.length === before) rows.push(result);
  });
  return { rows, errors, warnings };
}

export function buildImportPlan(rows: Item[], existing: Item[], strategy: DuplicateStrategy) {
  const existingIds = new Set(existing.map((item) => item.id));
  const add: Item[] = [];
  const update: Item[] = [];
  let skipped = 0;
  rows.forEach((row) => {
    if (!existingIds.has(row.id)) add.push(row);
    else if (strategy === "update") update.push(row);
    else skipped += 1;
  });
  return { add, update, added: add.length, updated: update.length, skipped };
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function compactNumber(value: number | null): string {
  return value === null ? "" : String(Math.round(value * 100) / 100);
}

export function serializeItemsCsv(items: Item[], today?: string): string {
  const rows = items.map((item) => {
    const metrics = calculateItemMetrics(item, today);
    return [
      item.id, item.name, item.category, item.brand, item.model, item.color, item.material,
      item.composition, item.season, compactNumber(item.price), item.startedAt, item.endedAt, item.dailyUse,
      item.useCount, item.notes, compactNumber(metrics.holdingDays),
      compactNumber(metrics.usageFrequencyDays), compactNumber(metrics.costPerUse),
    ].map(csvCell).join(",");
  });
  return `\uFEFF${ITEM_CSV_HEADERS.join(",")}\r\n${rows.join("\r\n")}`;
}
