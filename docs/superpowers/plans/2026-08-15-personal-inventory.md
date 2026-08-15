# Personal Inventory Phase One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the marker-specific application with a local-first personal inventory that imports and exports CSV while preserving the existing hand-drawn flip-book visual system.

**Architecture:** Keep the React/Vite application shell and reusable visual primitives, but replace marker domain types, mock data, stores, APIs, hooks, and page composition with item-focused modules. Keep calculations and CSV handling in pure functions, use a versioned local store as the single write boundary, and make pages compose tested feature components.

**Tech Stack:** React 18, TypeScript 5.7, Vite 6, Tailwind CSS 4, React Router 7, Rough.js, Recharts, Vitest, Testing Library, Playwright.

## Global Constraints

- Preserve the existing desk, paper, flip-book, sticky-note, handwritten font, color, shadow, radius, and Rough.js visual language.
- Replace every marker-specific user-facing label, mock record, route meaning, type, API, and hook.
- Use `personal_inventory_store_v1`; never mutate or migrate the old marker storage automatically.
- CSV is comma-delimited UTF-8, exported with BOM, and uses the exact fixed column order from the approved design.
- Treat `holdingDays`, `usageFrequencyDays`, and `costPerUse` as derived values.
- Use test-first red-green-refactor for every behavior-bearing production change.
- Do not add accounts, cloud sync, backend services, runtime Excel parsing, or image uploads.

---

## File Structure

- `src/types/index.ts`: personal-inventory domain types and CSV result types.
- `src/lib/itemMetrics.ts`: date and usage-cost calculations.
- `src/lib/itemFilters.ts`: pure search and filter rules.
- `src/lib/csv/itemsCsv.ts`: CSV parsing, validation, import planning, and serialization.
- `src/data/mock/items.ts`: normalized seed records extracted from `Things.xlsx`.
- `src/data/store.ts`: versioned store, atomic item/category/purchase/wishlist/settings updates.
- `src/hooks/useItems.ts`, `src/hooks/useInventoryStatistics.ts`: reactive store selectors.
- `src/components/features/items/*`: item table, item form, item detail, delete confirmation.
- `src/components/features/import-export/*`: CSV preview and import summary.
- `src/pages/*`: page composition and navigation destinations.
- `src/**/*.test.ts(x)`: unit and component tests next to owned behavior.

### Task 1: Testing Foundation and Item Metrics

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/lib/itemMetrics.test.ts`
- Create: `src/lib/itemMetrics.ts`
- Replace: `src/types/index.ts`

**Interfaces:**
- Produces: `Item`, `ItemMetrics`, `calculateItemMetrics(item, today?)`.
- Consumes: no personal-inventory production modules.

- [ ] **Step 1: Install and configure the test runner**

Run:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add scripts to `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Add to `vite.config.ts`:

```ts
/// <reference types="vitest/config" />

test: {
  environment: "jsdom",
  setupFiles: ["./src/test/setup.ts"],
}
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 2: Write metric tests before the implementation**

Create `src/lib/itemMetrics.test.ts` with cases equivalent to:

```ts
import { describe, expect, it } from "vitest";
import { calculateItemMetrics } from "./itemMetrics";

const baseItem = {
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

  it("returns null derived values when start date or use count is missing", () => {
    expect(calculateItemMetrics({ ...baseItem, startedAt: "", useCount: 0 })).toEqual({
      holdingDays: null,
      usageFrequencyDays: null,
      costPerUse: null,
    });
  });
});
```

- [ ] **Step 3: Run the metric test and verify the expected failure**

Run: `npm test -- src/lib/itemMetrics.test.ts`

Expected: FAIL because `itemMetrics.ts` and the item type do not exist.

- [ ] **Step 4: Add domain types and the minimal metric implementation**

Replace `src/types/index.ts` with the approved `Item` fields plus:

```ts
export type Item = {
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
  useCount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ItemMetrics = {
  holdingDays: number | null;
  usageFrequencyDays: number | null;
  costPerUse: number | null;
};

export type Category = { id: string; name: string };
export type ItemFilter = { query: string; category: string; incompleteOnly: boolean };
export type Purchase = {
  id: string;
  itemId: string;
  date: string;
  amount: number;
  note: string;
};
export type WishItem = {
  id: string;
  name: string;
  category: string;
  budget: number | null;
  priority: "high" | "medium" | "low";
};
export type AppSettings = {
  language: "zh-CN";
  currency: "CNY";
  dateFormat: "YYYY-MM-DD";
  autoBackup: boolean;
  incompleteInfoAlert: boolean;
  usageReminder: boolean;
};
```

Implement `calculateItemMetrics` by parsing local `YYYY-MM-DD` dates at UTC midnight, choosing `endedAt || today`, clamping negative holding durations to zero, and returning `null` when inputs are unavailable.

- [ ] **Step 5: Verify tests and commit**

Run: `npm test -- src/lib/itemMetrics.test.ts`

Expected: 2 tests PASS with no warnings.

Run:

```bash
git add package.json package-lock.json vite.config.ts src/test/setup.ts src/types/index.ts src/lib/itemMetrics.ts src/lib/itemMetrics.test.ts
git commit -m "feat: add personal item domain metrics"
```

### Task 2: Seed Data and Versioned Local Store

**Files:**
- Create: `src/data/mock/items.ts`
- Create: `src/data/store.test.ts`
- Replace: `src/data/store.ts`

**Interfaces:**
- Consumes: `Item`, `Category` from `src/types/index.ts`.
- Produces: `getStoreSnapshot()`, `subscribeDataChanges()`, `addItem()`, `updateItem()`, `removeItem()`, `recordItemUse()`, `importItems()`, category mutations, JSON backup functions.

- [ ] **Step 1: Write failing store tests**

Use an isolated `localStorage` and dynamic imports to verify:

```ts
it("loads Things.xlsx seed items only when v1 storage is absent", async () => {
  localStorage.clear();
  const store = await import("./store");
  expect(store.getStoreSnapshot().items.map((item) => item.id)).toContain("electronic02");
});

it("increments use count atomically", async () => {
  const store = await import("./store");
  const before = store.getStoreSnapshot().items.find((item) => item.id === "electronic02")!;
  store.recordItemUse("electronic02");
  const after = store.getStoreSnapshot().items.find((item) => item.id === "electronic02")!;
  expect(after.useCount).toBe(before.useCount + 1);
});
```

Also assert that rows with no name and no category are absent, `clothes02` is named `未命名半身裙`, and a pre-existing `personal_inventory_store_v1` snapshot is preserved.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/data/store.test.ts`

Expected: FAIL because the new store contract and seed data are absent.

- [ ] **Step 3: Add normalized seed data**

Create records for every meaningful spreadsheet row. Use source IDs unchanged, normalized ISO dates, `null` for unknown prices, zero for unknown use counts, and the worksheet name as the top-level category. Do not include blank placeholder rows or imported formula results.

- [ ] **Step 4: Implement the versioned store**

Use this state shape:

```ts
type PersistedStore = {
  version: 1;
  items: Item[];
  categories: Category[];
  purchases: Purchase[];
  wishlist: WishItem[];
  settings: AppSettings;
};
```

Each mutation must replace the affected array immutably, set `updatedAt`, persist once, and dispatch `personal_inventory_data_changed`. `importItems(items, "skip" | "update")` must return `{ added, updated, skipped }`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/data/store.test.ts`

Expected: all store tests PASS.

Run:

```bash
git add src/data/mock/items.ts src/data/store.ts src/data/store.test.ts
git commit -m "feat: seed and persist personal items"
```

### Task 3: Search, Filters, and Reactive Hooks

**Files:**
- Create: `src/lib/itemFilters.test.ts`
- Create: `src/lib/itemFilters.ts`
- Create: `src/hooks/useItems.ts`
- Create: `src/hooks/useInventoryStatistics.ts`
- Remove: marker-only hooks after their consumers are replaced.

**Interfaces:**
- Consumes: `Item`, `ItemFilter`, `getStoreSnapshot()`, `subscribeDataChanges()`.
- Produces: `filterItems(items, filter)`, `isItemIncomplete(item)`, `useItems(filter?)`, `useInventoryStatistics()`.

- [ ] **Step 1: Write failing filter tests**

Cover case-insensitive search across name, ID, brand, and model; exact category matching; combined filters; and incomplete detection requiring name, category, price, and start date.

```ts
expect(filterItems(items, { query: "apple", category: "", incompleteOnly: false }))
  .toHaveLength(2);
expect(isItemIncomplete({ ...items[0], price: null })).toBe(true);
```

- [ ] **Step 2: Verify red, implement pure filters, and verify green**

Run: `npm test -- src/lib/itemFilters.test.ts`

Expected before implementation: FAIL because exports are missing.

Implement one normalized search string per item and use a single array pass for the combined filter. Re-run the command and expect all tests PASS.

- [ ] **Step 3: Add reactive hooks**

Use `useSyncExternalStore` with the store subscription. `useItems` returns `{ items, allItems, categories }`; `useInventoryStatistics` returns total count, known total value, category count, incomplete count, recent items, category distribution, and monthly additions.

- [ ] **Step 4: Run all tests and commit**

Run: `npm test`

Expected: all current tests PASS.

Run:

```bash
git add src/lib/itemFilters.ts src/lib/itemFilters.test.ts src/hooks/useItems.ts src/hooks/useInventoryStatistics.ts
git commit -m "feat: add item filters and statistics hooks"
```

### Task 4: CSV Parser, Import Plan, and Serializer

**Files:**
- Create: `src/lib/csv/itemsCsv.test.ts`
- Create: `src/lib/csv/itemsCsv.ts`

**Interfaces:**
- Consumes: `Item`.
- Produces: `parseItemsCsv(text)`, `buildImportPlan(rows, existingItems, strategy)`, `serializeItemsCsv(items, today?)`, `ITEM_CSV_HEADERS`.

- [ ] **Step 1: Write failing CSV tests**

Tests must include Chinese characters, BOM, quoted commas, escaped quotes, embedded newlines, missing required headers, invalid dates, negative numbers, duplicate IDs, unknown headers, and ignored derived columns.

```ts
const csv = '\uFEFF编号,名称,分类,备注\r\nclothes12,"衬衫,白色",衣服,"含""引号"""';
const result = parseItemsCsv(csv);
expect(result.validRows[0]).toMatchObject({ id: "clothes12", name: "衬衫,白色" });
```

Assert that serialization begins with `\uFEFF` and uses the exact header order from the design.

- [ ] **Step 2: Run CSV tests and verify failure**

Run: `npm test -- src/lib/csv/itemsCsv.test.ts`

Expected: FAIL because the CSV module is absent.

- [ ] **Step 3: Implement RFC-style CSV tokenization and validation**

Use a character-state parser so quoted newlines and doubled quotes are supported. Return:

```ts
type CsvParseResult = {
  validRows: ItemImportRow[];
  issues: Array<{ row: number; severity: "warning" | "error"; message: string }>;
  unknownHeaders: string[];
};
```

Reject empty IDs/names/categories, invalid ISO dates, negative price, and negative or fractional use counts. Treat unknown columns as warnings. Never evaluate cell content as formulas.

- [ ] **Step 4: Implement import planning and export**

`buildImportPlan` partitions rows into `add`, `update`, `skip`, and `error`. `serializeItemsCsv` writes CRLF rows, BOM, fixed columns, and freshly calculated derived values.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/lib/csv/itemsCsv.test.ts`

Expected: all CSV tests PASS.

Run:

```bash
git add src/lib/csv/itemsCsv.ts src/lib/csv/itemsCsv.test.ts
git commit -m "feat: support item CSV import and export"
```

### Task 5: Navigation, Item Library, and Item Detail

**Files:**
- Modify: `src/config/navigation.ts`
- Modify: `src/app/router.tsx`
- Create: `src/components/features/items/ItemTable.tsx`
- Create: `src/components/features/items/ItemFormModal.tsx`
- Create: `src/components/features/items/ItemDetail.tsx`
- Create: `src/components/features/items/ItemLibrary.test.tsx`
- Replace: `src/pages/LibraryPage.tsx`
- Replace: `src/pages/DetailPage.tsx`
- Modify: `src/contexts/AddMarkerModalContext.tsx` and `src/components/layout/AppLayout.tsx` by renaming the context and modal ownership to items.

**Interfaces:**
- Consumes: item hooks and store mutations.
- Produces: searchable item library, add/edit/delete/detail/use interactions, item routes `/items/:itemId`.

- [ ] **Step 1: Write failing interaction tests**

Render the library with seed data and assert that typing `apple` filters results, choosing `衣服` restricts categories, opening an item shows detail fields, form validation blocks a missing name, and “记录一次使用” increments the visible count.

- [ ] **Step 2: Run interaction tests and verify failure**

Run: `npm test -- src/components/features/items/ItemLibrary.test.tsx`

Expected: FAIL because personal-item UI components do not exist.

- [ ] **Step 3: Implement components with existing visual primitives**

Reuse the existing `Button`, `Input`, `Select`, `Table`, `Modal`, `RoughBox`, typography classes, and motion helpers. Keep all form labels code-native Chinese. Use lucide icons only where the existing interface already uses the same outline icon treatment.

- [ ] **Step 4: Replace routes and context ownership**

Rename marker creation context to `AddItemModalContext`, expose `openAddItem()` and `openEditItem(item)`, and update `AppLayout` to render `ItemFormModal`. Replace marker routes and labels with the approved navigation.

- [ ] **Step 5: Verify tests, type-check through build, and commit**

Run:

```bash
npm test -- src/components/features/items/ItemLibrary.test.tsx
npm run build
```

Expected: tests PASS and Vite build exits 0.

Run:

```bash
git add src/config/navigation.ts src/app/router.tsx src/contexts src/components/features/items src/components/layout/AppLayout.tsx src/pages/LibraryPage.tsx src/pages/DetailPage.tsx
git commit -m "feat: replace marker library with item management"
```

### Task 6: Dashboard, Overview, Categories, Purchases, Wishlist, and Statistics

**Files:**
- Replace: `src/pages/DashboardPage.tsx`
- Replace: `src/pages/OverviewPage.tsx`
- Replace: `src/pages/InventoryPage.tsx`
- Replace: `src/pages/BrandsPage.tsx`
- Replace: `src/pages/PurchasesPage.tsx`
- Replace: `src/pages/WishlistPage.tsx`
- Replace: `src/pages/StatsPage.tsx`
- Replace marker-specific feature and chart components with item equivalents under `src/components/features/` and `src/components/charts/`.
- Create: `src/pages/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `useInventoryStatistics`, store category/purchase/wishlist mutations.
- Produces: every non-import primary page in the approved navigation.

- [ ] **Step 1: Write failing dashboard and category tests**

Assert that dashboard totals equal the seed snapshot, incomplete count excludes fully populated items, empty chart data renders a directed empty state, and deleting a category with associated items is rejected.

- [ ] **Step 2: Verify red, then replace page composition**

Run: `npm test -- src/pages/DashboardPage.test.tsx`

Expected before implementation: FAIL on marker copy or missing personal metrics.

Implement pages by recomposing existing hand-drawn layout components. Replace stock/borrowed metrics with item total/value/category/incomplete metrics. Replace brand/series charts with category distribution, value distribution, and monthly additions.

- [ ] **Step 3: Replace purchase and wishlist semantics**

Purchases use `{ id, itemId, date, amount, note }`; wishes use `{ id, name, category, budget, priority }`. Keep the existing local-modal interaction pattern and handwritten visual style.

- [ ] **Step 4: Remove remaining marker feature imports and verify**

Run:

```bash
rg -n "Marker|marker|马克笔|品牌与系列|库存" src
npm test
npm run build
```

Expected: `rg` reports no user-facing marker domain references outside historical attribution text; tests PASS; build exits 0.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/pages src/components/features src/components/charts src/types/index.ts src/data/store.ts
git commit -m "feat: complete personal inventory pages"
```

### Task 7: CSV Import/Export UI and Complete Backup

**Files:**
- Create: `src/components/features/import-export/CsvImportPanel.tsx`
- Create: `src/components/features/import-export/CsvPreviewTable.tsx`
- Create: `src/components/features/import-export/CsvImportPanel.test.tsx`
- Replace: `src/pages/ExportPage.tsx`
- Update: `src/lib/download.ts`
- Update: `src/lib/export.ts`

**Interfaces:**
- Consumes: CSV pure functions, current filtered/all items, `importItems`, JSON backup functions.
- Produces: safe preview-before-write CSV import, all/filtered CSV export, full JSON backup/restore.

- [ ] **Step 1: Write failing CSV UI tests**

Mock only the browser file boundary. Assert that invalid rows appear before confirmation, store mutation is not called during preview, duplicate strategy defaults to skip, confirmation shows added/updated/skipped/failed counts, and export uses `personal-items-YYYY-MM-DD.csv`.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/components/features/import-export/CsvImportPanel.test.tsx`

Expected: FAIL because CSV import components do not exist.

- [ ] **Step 3: Implement preview and atomic confirmation**

Keep selected file text in component state, parse once on selection, build a new plan when the conflict strategy changes, and call `importItems` only from the confirmation event. Disable confirmation when there are no valid rows.

- [ ] **Step 4: Implement download actions**

Create `downloadTextFile(text, filename, "text/csv;charset=utf-8")`. Provide “导出全部物品” and “导出当前筛选结果”; keep JSON actions clearly labeled “完整备份” and “恢复完整备份”.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/components/features/import-export/CsvImportPanel.test.tsx
npm test
npm run build
```

Expected: CSV UI tests and full suite PASS; build exits 0.

Run:

```bash
git add src/components/features/import-export src/pages/ExportPage.tsx src/lib/download.ts src/lib/export.ts
git commit -m "feat: add safe CSV exchange workflow"
```

### Task 8: Settings, Copy Audit, and Responsive Browser Verification

**Files:**
- Replace: `src/pages/SettingsPage.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/StickyNotes.tsx`
- Modify: `src/components/Book/bookPages.tsx`
- Modify: `src/styles/*.css` only for necessary responsive corrections in the existing design language.
- Remove: unused marker-only API, hook, mock, feature, and chart files after import references reach zero.

**Interfaces:**
- Consumes: completed personal inventory application.
- Produces: no marker copy, production build, verified desktop/mobile workflows.

- [ ] **Step 1: Replace settings and all remaining visible copy**

Keep language, currency, date format, backup, and notification settings that apply to personal items. Replace marker-specific alert settings with incomplete-information and usage-reminder settings.

- [ ] **Step 2: Run the copy and dead-import audit**

Run:

```bash
rg -n "Marker|marker|markers|马克笔|色号|补充库存|借出" src
npm test
npm run build
```

Expected: no personal-inventory UI contains marker terms; tests PASS; build exits 0.

- [ ] **Step 3: Verify core desktop workflow in the in-app browser**

At a viewport matching the existing primary layout, verify:

1. Search and category filters update the visible item rows.
2. Add, edit, delete confirmation, detail view, and record-use actions update local UI state.
3. CSV preview shows valid/error counts and does not write before confirmation.
4. CSV export downloads a BOM-prefixed file with the approved header order.
5. Page flips, header, desk, paper, sticky notes, typography, borders, shadows, and icons remain visually consistent with the original application.

- [ ] **Step 4: Verify mobile and reduced-motion behavior**

Check a 390×844 viewport for horizontal overflow, clipped controls, table fallback, modal scrolling, focus visibility, and single-page scroll behavior. Emulate reduced motion and confirm decorative transitions are removed without hiding content.

- [ ] **Step 5: Capture final screenshots and perform fidelity review**

Capture desktop library, desktop CSV preview, and mobile library screenshots. Compare each with the existing application's locked visual system using `view_image`. Record at least five comparison points: typography, paper/desk palette, hand-drawn borders, component spacing, icon treatment, and responsive behavior. Fix every actionable mismatch.

- [ ] **Step 6: Final verification and commit**

Run:

```bash
npm test
npm run build
git status --short
```

Expected: all tests PASS, build exits 0, and status contains only intentional source changes before commit.

Run:

```bash
git add src package.json package-lock.json vite.config.ts
git commit -m "feat: finish personal inventory phase one"
```

## Plan Self-Review

- Every approved page, data rule, CSV rule, error state, and visual constraint maps to at least one task.
- Domain signatures are consistent: `Item`, `calculateItemMetrics`, `filterItems`, `parseItemsCsv`, `buildImportPlan`, `serializeItemsCsv`, and store mutation names are defined before use.
- Each behavior task starts with a failing test, verifies the failure, adds minimal production behavior, and re-runs tests.
- The plan contains no deferred implementation placeholders and no runtime Excel dependency.
