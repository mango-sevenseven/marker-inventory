import { useMemo, useState, useSyncExternalStore } from "react";
import { AlertCircle, ArrowDown, ArrowUp, BarChart3, Box, CalendarDays, Heart, PackageOpen, Pencil, Plus, ShoppingBag, Sparkles, Trash2 } from "lucide-react";
import { personalStore, type PersonalStore, type PersonalStoreSnapshot } from "@/data/personalStore";
import { filterItems, isItemIncomplete } from "@/lib/itemFilters";
import { calculateDashboardInsights, type ExpiringItemInsight, type ItemInsight } from "@/lib/dashboardInsights";
import { calculateDailyExpense, calculateItemMetrics, getLocalTodayIso } from "@/lib/itemMetrics";
import type { AttributeDefinition, Item, ItemFilter } from "@/types/personalInventory";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatsGrid } from "@/components/ui/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { CsvExchangePanel } from "./CsvExchangePanel";
import { openItemDialog } from "./ItemDialogHost";
import { InventorySettingsPanel } from "./InventorySettingsPanel";

export type PersonalView = "dashboard" | "overview" | "library" | "categories" | "purchases" | "wishlist" | "stats" | "export" | "settings";

const titles: Record<PersonalView, [string, string]> = {
  dashboard: ["我的物品手账", "把拥有的东西记清楚，也把每一次使用记下来。"],
  overview: ["物品总览", "从分类、价值和信息完整度查看你的全部物品。"],
  library: ["物品库", "搜索、筛选并维护每一件物品。"],
  categories: ["分类管理", "按生活场景整理物品。"],
  purchases: ["购入记录", "第一阶段先从现有物品的购入日期和价格汇总。"],
  wishlist: ["心愿清单", "给准备购买的物品留一页。"],
  stats: ["统计分析", "让使用次数和单次成本帮助你判断什么真正值得。"],
  export: ["导出与备份", "用 CSV 与 Excel 交换物品，用 JSON 保存完整状态。"],
  settings: ["设置", "管理物品属性与类别。"],
};

function money(value: number) { return `¥${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`; }

function attributeDisplayValue(item: Item, attribute: AttributeDefinition) {
  if (attribute.itemKey === "price") return item.price === null ? "—" : money(item.price);
  const value = attribute.itemKey ? item[attribute.itemKey] : item.customValues?.[attribute.id];
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function PageTitle({ view, embedded = false }: { view: PersonalView; embedded?: boolean }) {
  const Heading = embedded ? "h2" : "h1";
  return <div className="mb-5"><Heading className="text-[26px] font-bold">{titles[view][0]}</Heading><p className="mt-1 text-sm text-muted">{titles[view][1]}</p></div>;
}

function InsightCard({ title, item, primary, secondary, empty }: { title: string; item: Item | null; primary?: string; secondary?: string; empty: string }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {item ? (
        <button className="sketch-row w-full py-2 text-left" onClick={() => openItemDialog(item.id)}>
          <b className="block text-base">{item.name}</b>
          <span className="mt-1 block text-sm">{primary}</span>
          {secondary ? <small className="mt-1 block text-muted">{secondary}</small> : null}
        </button>
      ) : <p className="text-sm text-muted">{empty}</p>}
    </Card>
  );
}

export function InventoryExpiryCard({ items, title = "即将过期" }: { items: ExpiringItemInsight[]; title?: string }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {items.length > 0 ? (
        <div>
          {items.map(({ item, daysRemaining }) => (
            <button
              key={item.id}
              className="sketch-row grid w-full grid-cols-[minmax(0,1fr)_96px] gap-3 px-2 py-2 text-left"
              onClick={() => openItemDialog(item.id)}
            >
              <b className="truncate text-base">{item.name}</b>
              <span className="text-right text-sm">{daysRemaining} 天</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="px-2 text-sm text-muted">未来 15 天内暂无即将过期的物品。</p>
      )}
    </Card>
  );
}

function LongestOwnedCard({ items }: { items: ItemInsight[] }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-bold">陪伴最久</h2>
      {items.length > 0 ? <div>{items.map(({ item, metrics }) => <button key={item.id} className="sketch-row grid w-full grid-cols-[minmax(0,1fr)_124px] gap-3 px-2 py-2 text-left" onClick={() => openItemDialog(item.id)}><b className="truncate text-base">{item.name}</b><span className="text-right text-sm">{metrics.holdingDays}</span></button>)}</div> : <p className="px-2 text-sm text-muted">暂无填写开始时间的物品。</p>}
    </Card>
  );
}

function DailyExpenseCard({ items }: { items: Item[] }) {
  const today = getLocalTodayIso();
  const dailyExpense = useMemo(() => calculateDailyExpense(items, today), [items, today]);
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-bold">每日花费</h2>
      <p className="text-2xl font-bold text-[#b07b38]">{money(dailyExpense)}</p>
      <p className="mt-2 text-sm text-muted">未弃用物品的价格 ÷ 使用天数，每天自动更新。</p>
      <small className="mt-2 block text-muted">计算日期：{today}</small>
    </Card>
  );
}

function DailyUsageCard({ snapshot, store }: { snapshot: PersonalStoreSnapshot; store: PersonalStore }) {
  const today = getLocalTodayIso();
  const [date, setDate] = useState(today);
  const savedItemIds = useMemo(
    () => snapshot.dailyUsageRecords.find((record) => record.date === date)?.itemIds ?? [],
    [date, snapshot.dailyUsageRecords],
  );
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(savedItemIds);
  const [message, setMessage] = useState("");
  const activeItems = useMemo(
    () => snapshot.items.filter((item) => (item.startedAt === "" || item.startedAt <= date) && (item.endedAt === "" || item.endedAt > date)),
    [date, snapshot.items],
  );

  const changeDate = (nextDate: string) => {
    setDate(nextDate);
    setSelectedItemIds(snapshot.dailyUsageRecords.find((record) => record.date === nextDate)?.itemIds ?? []);
    setMessage("");
  };
  const toggleItem = (itemId: string) => {
    setSelectedItemIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]);
    setMessage("");
  };
  const save = () => {
    store.setDailyUsage(date, selectedItemIds);
    setMessage(`已保存 ${date} 的使用记录，共 ${selectedItemIds.length} 件物品。`);
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">每日使用</h2>
        <Input aria-label="使用日期" type="date" className="!w-auto" value={date} max={today} onChange={(event) => changeDate(event.target.value)} />
      </div>
      <p className="mb-2 text-sm text-muted">勾选当天使用过的物品，保存后同步更新统计分析中的使用次数。</p>
      <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
        {activeItems.map((item) => (
          <label key={item.id} className="sketch-row flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm">
            <input type="checkbox" aria-label={`使用${item.name}-${item.id}`} checked={selectedItemIds.includes(item.id)} onChange={() => toggleItem(item.id)} />
            <span className="truncate">{item.name}</span>
          </label>
        ))}
        {activeItems.length === 0 ? <p className="px-2 text-sm text-muted">该日期暂无可记录的物品。</p> : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">已选择 {selectedItemIds.length} 件</span>
        <Button variant="primary" className="!w-auto" onClick={save}>保存每日使用</Button>
      </div>
      {message ? <p role="status" className="mt-2 text-sm font-bold text-[#39734c]">{message}</p> : null}
    </Card>
  );
}

function metricNumber(value: number | null) {
  return value === null ? "—" : (Math.round(value * 100) / 100).toLocaleString("zh-CN");
}

const DAILY_USE_VALUES = new Set(["是", "每天", "每日", "yes", "true", "1"]);

function isDailyUseItem(item: Item, snapshot: PersonalStoreSnapshot) {
  if (DAILY_USE_VALUES.has(item.dailyUse.trim().toLowerCase())) return true;
  const categoryAttributes = snapshot.categories.find((category) => category.name === item.category)?.attributes ?? [];
  return [...snapshot.baseAttributes, ...categoryAttributes]
    .filter((attribute) => attribute.name.trim() === "是否每天使用")
    .some((attribute) => DAILY_USE_VALUES.has((item.customValues?.[attribute.id] ?? "").trim().toLowerCase()));
}

function ValueForMoneyTable({ snapshot }: { snapshot: PersonalStoreSnapshot }) {
  const { items } = snapshot;
  const [costSort, setCostSort] = useState<"asc" | "desc" | null>(null);
  const rows = useMemo(() => items.map((item, index) => {
    const dateMetrics = calculateItemMetrics(item);
    const useCount = isDailyUseItem(item, snapshot) && dateMetrics.holdingDays !== null ? dateMetrics.holdingDays : item.useCount;
    return { item, index, useCount, metrics: calculateItemMetrics({ ...item, useCount }) };
  }), [items, snapshot]);
  const sortedRows = useMemo(() => {
    if (!costSort) return rows;
    return [...rows].sort((left, right) => {
      const leftCost = left.metrics.costPerUse;
      const rightCost = right.metrics.costPerUse;
      if (leftCost === null && rightCost === null) return left.index - right.index;
      if (leftCost === null) return 1;
      if (rightCost === null) return -1;
      return costSort === "asc" ? leftCost - rightCost : rightCost - leftCost;
    });
  }, [costSort, rows]);
  return (
    <Card className="p-5 md:col-span-2">
      <h2 className="text-lg font-bold">性价比</h2>
      <p className="mb-4 mt-1 text-sm text-muted">“是否每天使用”为“是”的物品，使用次数按使用时间计算；其他物品使用实际记录次数。</p>
      <div className="overflow-x-auto pb-2">
        <Table className="min-w-[1120px]">
          <TableHead>
            <tr>
              {[
                "名称",
                "价格",
                "单次使用成本",
                "购入日期",
                "弃用日期",
                "使用时间（天）",
                "使用次数",
                "使用频率（天/次）",
              ].map((heading) => (
                <TableHeaderCell key={heading} className="whitespace-nowrap">
                  {heading === "单次使用成本" ? (
                    <span className="inline-flex items-center gap-1">
                      <span>{heading}</span>
                      <button type="button" aria-label="单次使用成本升序" aria-pressed={costSort === "asc"} title="按单次使用成本升序" className={`rounded-sm p-0.5 hover:bg-ink/10 ${costSort === "asc" ? "bg-ink/15" : ""}`} onClick={() => setCostSort("asc")}><ArrowUp size={13} /></button>
                      <button type="button" aria-label="单次使用成本降序" aria-pressed={costSort === "desc"} title="按单次使用成本降序" className={`rounded-sm p-0.5 hover:bg-ink/10 ${costSort === "desc" ? "bg-ink/15" : ""}`} onClick={() => setCostSort("desc")}><ArrowDown size={13} /></button>
                    </span>
                  ) : heading}
                </TableHeaderCell>
              ))}
            </tr>
          </TableHead>
          <TableBody>
            {sortedRows.map(({ item, metrics, useCount }) => {
              return (
                <TableRow key={item.id}>
                  <TableCell className="min-w-[140px]">
                    <button className="text-left font-bold hover:underline" onClick={() => openItemDialog(item.id)}>{item.name}</button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{item.price === null ? "—" : money(item.price)}</TableCell>
                  <TableCell className="whitespace-nowrap">{metrics.costPerUse === null ? "—" : money(metrics.costPerUse)}</TableCell>
                  <TableCell className="whitespace-nowrap">{item.startedAt || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{item.endedAt || "使用中"}</TableCell>
                  <TableCell>{metricNumber(metrics.holdingDays)}</TableCell>
                  <TableCell>{useCount}</TableCell>
                  <TableCell>{metricNumber(metrics.usageFrequencyDays)}</TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 ? <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted">暂无物品数据。</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function Library({ store }: { store: PersonalStore }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [filter, setFilter] = useState<ItemFilter>({ name: "", category: "" });
  const items = useMemo(() => filterItems(snapshot.items, filter), [snapshot.items, filter]);
  return (
    <>
      <div className="mb-4 grid gap-2 md:grid-cols-[1fr_180px_auto]">
        <Input aria-label="名称" placeholder="名称" value={filter.name} onChange={(event) => setFilter({ ...filter, name: event.target.value })} />
        <Select aria-label="类别" value={filter.category} onChange={(event) => setFilter({ ...filter, category: event.target.value })}><option value="">全部类别</option>{snapshot.categories.map((category) => <option key={category.id}>{category.name}</option>)}</Select>
        <Button variant="primary" className="!w-auto" onClick={() => openItemDialog()}><Plus size={15} /> 添加物品</Button>
      </div>
      <p className="mb-2 text-xs text-muted">找到 {items.length} 件物品</p>
      <div className="overflow-x-auto pb-2">
        <Table style={{ minWidth: Math.max(720, snapshot.baseAttributes.length * 140 + 180) }}>
          <TableHead><tr>
            {snapshot.baseAttributes.map((attribute) => <TableHeaderCell key={attribute.id} className="whitespace-nowrap">{attribute.name}</TableHeaderCell>)}
            <TableHeaderCell className="whitespace-nowrap">操作</TableHeaderCell>
          </tr></TableHead>
          <TableBody>{items.map((item) => <TableRow key={item.id}>
            {snapshot.baseAttributes.map((attribute) => <TableCell key={attribute.id} className="max-w-[220px] whitespace-nowrap"><div className="truncate" title={attributeDisplayValue(item, attribute)}>{attribute.itemKey === "name" ? <button className="text-left font-bold hover:underline" onClick={() => openItemDialog(item.id)}>{attributeDisplayValue(item, attribute)}</button> : attributeDisplayValue(item, attribute)}</div></TableCell>)}
            <TableCell>
              <div className="flex gap-2">
                <Button size="sm" className="!w-auto" aria-label={`编辑${item.name}`} onClick={() => openItemDialog(item.id)}><Pencil size={13} /> 编辑</Button>
                <Button size="sm" variant="destructive" className="!w-auto" aria-label={`删除${item.name}`} onClick={() => { if (window.confirm(`确定删除“${item.name}”吗？删除后无法恢复。`)) store.removeItem(item.id); }}><Trash2 size={13} /> 删除</Button>
              </div>
            </TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </div>
      {items.length === 0 ? <Card className="p-8 text-center"><PackageOpen className="mx-auto mb-2" /><p className="font-bold">没有符合条件的物品</p><p className="text-sm text-muted">调整搜索或筛选条件。</p></Card> : null}
    </>
  );
}

export function PersonalInventoryPage({ view, store = personalStore, embedded = false, onViewChange, onOpenSettings }: { view: PersonalView; store?: PersonalStore; embedded?: boolean; onViewChange?: (view: PersonalView) => void; onOpenSettings?: () => void }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const insights = useMemo(
    () => calculateDashboardInsights(
      snapshot.items,
      undefined,
      undefined,
      undefined,
      undefined,
      (item) => isDailyUseItem(item, snapshot),
    ),
    [snapshot],
  );
  const stats = useMemo(() => {
    const valueStats = snapshot.items.reduce((result, item) => {
      const price = item.price ?? 0;
      result.value += price;
      if (item.endedAt !== "") {
        result.consumed += 1;
        result.consumedValue += price;
      }
      return result;
    }, { value: 0, consumed: 0, consumedValue: 0 });
    const incomplete = snapshot.items.filter(isItemIncomplete).length;
    const byCategory = snapshot.categories.map((category) => ({ ...category, items: snapshot.items.filter((item) => item.category === category.name) }));
    return { ...valueStats, incomplete, byCategory };
  }, [snapshot]);
  const openView = (nextView: "library" | "stats" | "settings") => {
    if (onViewChange) {
      onViewChange(nextView);
      return;
    }
    const suffix = nextView === "library" ? "library" : nextView;
    window.location.assign(`${import.meta.env.BASE_URL}life/items/${suffix}`);
  };

  const content = (() => {
    if (view === "library") return <Library store={store} />;
    if (view === "dashboard") return <>
      <StatsGrid className="personal-stats-grid" items={[
        { label: "物品总数", value: `${snapshot.items.length}`, sub: "来自 Things.xlsx", accentColor: "#5a8c6a", icon: <Box /> },
        { label: "物品价值", value: money(stats.value), sub: "全部物品价格合计", accentColor: "#b07b38", icon: <ShoppingBag /> },
        { label: "消耗物品", value: `${stats.consumed}`, sub: "已填写截止时间", accentColor: "#6687ad", icon: <Sparkles /> },
        { label: "消耗价值", value: money(stats.consumedValue), sub: "已消耗物品价格合计", accentColor: "#c87050", icon: <AlertCircle /> },
      ]} />
      <div className="grid gap-4 md:grid-cols-2">
        <InsightCard title="性价比最高" item={insights.bestValue?.item ?? null} primary={insights.bestValue?.metrics.costPerUse !== null && insights.bestValue ? `单次成本 ${money(insights.bestValue.metrics.costPerUse)}` : undefined} secondary="单次使用成本最低" empty="填写价格并记录使用后，即可计算性价比。" />
        <InsightCard title="性价比最低" item={insights.worstValue?.item ?? null} primary={insights.worstValue?.metrics.costPerUse !== null && insights.worstValue ? `单次成本 ${money(insights.worstValue.metrics.costPerUse)}` : undefined} secondary="单次使用成本最高" empty="填写价格并记录使用后，即可计算性价比。" />
        <LongestOwnedCard items={insights.longestOwned} />
        <DailyExpenseCard items={snapshot.items} />
        <DailyUsageCard snapshot={snapshot} store={store} />
        <Card className="p-4">
          <h2 className="mb-3 text-lg font-bold">快捷操作</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => openItemDialog()}><Plus size={15} /> 添加物品</Button>
            <Button onClick={() => openView("library")}>物品库</Button>
            <Button onClick={() => openView("stats")}><BarChart3 size={15} /> 统计分析</Button>
            <Button onClick={() => onOpenSettings ? onOpenSettings() : openView("settings")}>设置</Button>
          </div>
        </Card>
      </div>
    </>;
    if (view === "overview" || view === "categories") return <div className="grid gap-4 md:grid-cols-3">{stats.byCategory.map((category, index) => <Card key={category.id} className="p-4" style={{ transform: `rotate(${[-0.5, 0.4, -0.2][index % 3]}deg)` }}><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">{category.name}</h2><span className="text-2xl">{category.items.length}</span></div><div className="h-2 rounded bg-secondary"><div className="h-full rounded bg-[#6f8b68]" style={{ width: `${Math.max(8, category.items.length / snapshot.items.length * 100)}%` }} /></div><p className="mt-3 text-sm text-muted">已记录价值 {money(category.items.reduce((sum, item) => sum + (item.price ?? 0), 0))}</p></Card>)}</div>;
    if (view === "stats") return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <BarChart3 className="mb-2" />
          <h2 className="text-lg font-bold">分类占比</h2>
          {stats.byCategory.map((category) => <div key={category.id} className="mt-3"><div className="flex justify-between text-sm"><span>{category.name}</span><b>{category.items.length}</b></div><div className="mt-1 h-3 overflow-hidden rounded bg-secondary"><div className="h-full bg-[#6687ad]" style={{ width: `${category.items.length / snapshot.items.length * 100}%` }} /></div></div>)}
        </Card>
        <Card className="p-5">
          <CalendarDays className="mb-2" />
          <h2 className="text-lg font-bold">使用价值</h2>
          <p className="mt-2 text-sm text-muted">已记录使用次数 {snapshot.items.reduce((sum, item) => sum + item.useCount, 0)} 次。</p>
          <p className="mt-4 text-sm">记录物品使用次数后，单次使用成本会自动更新。</p>
        </Card>
        <ValueForMoneyTable snapshot={snapshot} />
      </div>
    );
    if (view === "export") return <CsvExchangePanel items={snapshot.items} store={store} />;
    if (view === "settings") return <InventorySettingsPanel snapshot={snapshot} store={store} />;
    if (view === "purchases") return <Card className="p-8 text-center"><ShoppingBag className="mx-auto mb-3" /><h2 className="text-xl font-bold">购入信息已经合并进物品</h2><p className="mt-2 text-sm text-muted">在物品详情中填写价格和开始时间，即可纳入价值统计。</p><Button className="mx-auto mt-4 !w-auto" onClick={() => openItemDialog()}>添加一件物品</Button></Card>;
    return <Card className="p-8 text-center"><Heart className="mx-auto mb-3" /><h2 className="text-xl font-bold">心愿清单准备好了</h2><p className="mt-2 text-sm text-muted">第一阶段先把已有物品整理清楚，心愿记录将在下一阶段扩展。</p></Card>;
  })();

  return <div><PageTitle view={view} embedded={embedded} />{content}</div>;
}
