import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, Layers3, Pencil, Plus, Shirt, Sparkles, Trash2, X } from "lucide-react";
import { getTodayIso, lifeSystemStore, type LifeSystemStore } from "@/data/lifeSystemStore";
import { personalStore, type PersonalStore, type PersonalStoreSnapshot } from "@/data/personalStore";
import { syncOutfitItemUsage } from "@/lib/outfitUsage";
import type { LifeSystemSnapshot, OutfitLog, OutfitTemplate } from "@/types/lifeSystem";
import type { Item } from "@/types/personalInventory";

type OutfitSection = "today" | "templates" | "calendar" | "stats";

const clothingItems = (inventory: PersonalStoreSnapshot) => inventory.items.filter((item) => item.category === "衣服" || /衣|裤|裙|鞋|包|外套|衫/.test(`${item.category}${item.name}`));

function ClothingImage({ item, className = "" }: { item?: Item; className?: string }) {
  return <span className={`outfit-clothing-image ${className}`}>{item?.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <Shirt aria-hidden="true" />}</span>;
}

function OutfitImageGroup({ itemIds, itemMap, limit = 3 }: { itemIds: string[]; itemMap: Map<string, Item>; limit?: number }) {
  return <div className="outfit-image-group" aria-label={`${itemIds.length}件衣服`}>{itemIds.slice(0, limit).map((id) => <ClothingImage key={id} item={itemMap.get(id)} />)}{itemIds.length > limit ? <span className="outfit-image-more">+{itemIds.length - limit}</span> : null}</div>;
}

function OutfitPicker({ items, selected, onToggle, labelPrefix = "选择" }: { items: ReturnType<typeof clothingItems>; selected: string[]; onToggle: (id: string) => void; labelPrefix?: string }) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  return <div className="outfit-picker">{items.map((item) => <label key={item.id} className={selectedSet.has(item.id) ? "selected" : ""}><input type="checkbox" aria-label={`${labelPrefix}${item.name}-${item.id}`} checked={selectedSet.has(item.id)} onChange={() => onToggle(item.id)} /><ClothingImage item={item} /><b>{item.name}</b><small>{item.color || item.season || "衣服"}</small></label>)}{items.length === 0 ? <p className="system-empty">衣橱里还没有衣服，请先点击“添加衣服”。</p> : null}</div>;
}

function TodayOutfit({ snapshot, inventory, lifeStore, inventoryStore, today, initialTemplate }: { snapshot: LifeSystemSnapshot; inventory: PersonalStoreSnapshot; lifeStore: LifeSystemStore; inventoryStore: PersonalStore; today: string; initialTemplate?: OutfitTemplate }) {
  const initialLog = snapshot.outfitLogs.find((log) => log.date === today);
  const [date, setDate] = useState(today);
  const [templateId, setTemplateId] = useState(initialTemplate?.id ?? initialLog?.templateId ?? "");
  const [itemIds, setItemIds] = useState(initialTemplate?.itemIds ?? initialLog?.itemIds ?? []);
  const [occasion, setOccasion] = useState(initialTemplate?.occasion ?? initialLog?.occasion ?? "");
  const [weather, setWeather] = useState(initialLog?.weather ?? "");
  const [notes, setNotes] = useState(initialLog?.notes ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const clothes = useMemo(() => clothingItems(inventory), [inventory]);
  const existing = snapshot.outfitLogs.find((log) => log.date === date);

  const loadDate = (nextDate: string) => {
    const log = snapshot.outfitLogs.find((entry) => entry.date === nextDate);
    setDate(nextDate); setTemplateId(log?.templateId ?? ""); setItemIds(log?.itemIds ?? []); setOccasion(log?.occasion ?? ""); setWeather(log?.weather ?? ""); setNotes(log?.notes ?? ""); setMessage(""); setError("");
  };
  const applyTemplate = (id: string) => {
    const template = snapshot.outfitTemplates.find((entry) => entry.id === id);
    setTemplateId(id); setItemIds(template?.itemIds ?? []); setOccasion(template?.occasion ?? occasion); setMessage(""); setError("");
  };
  const toggle = (id: string) => setItemIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  const save = (event: FormEvent) => {
    event.preventDefault();
    try {
      const input = { date, templateId, itemIds, occasion, weather, notes };
      if (existing) {
        const previous = existing.itemIds;
        const updated = lifeStore.updateOutfitLog(existing.id, input);
        syncOutfitItemUsage(inventoryStore, previous, updated.itemIds);
      } else {
        const created = lifeStore.addOutfitLog(input);
        syncOutfitItemUsage(inventoryStore, [], created.itemIds);
      }
      setMessage(`已记录 ${date} 的穿搭，共 ${itemIds.length} 件衣服。`); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "保存失败"); }
  };
  const remove = () => {
    if (!existing || !window.confirm(`删除 ${date} 的穿搭记录？物品使用次数会同步撤回。`)) return;
    lifeStore.deleteOutfitLog(existing.id); syncOutfitItemUsage(inventoryStore, existing.itemIds, []); loadDate(date);
  };

  return <form className="outfit-today-layout" onSubmit={save}><section className="paper-panel outfit-record-panel"><div className="outfit-record-heading"><div><span>{existing ? "修改今日穿搭" : "记录今日穿搭"}</span><small>保存后同步更新物品使用次数和单次使用成本</small></div><input aria-label="穿搭日期" type="date" value={date} onChange={(event) => loadDate(event.target.value)} /></div><div className="outfit-record-fields"><label>固定搭配<select aria-label="选择固定搭配" value={templateId} onChange={(event) => applyTemplate(event.target.value)}><option value="">自由搭配</option>{snapshot.outfitTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><label>场景<input value={occasion} onChange={(event) => setOccasion(event.target.value)} placeholder="通勤、约会、运动…" /></label><label>天气<input value={weather} onChange={(event) => setWeather(event.target.value)} placeholder="晴天、降温、多云…" /></label></div><h3>今天穿了哪些衣服</h3><OutfitPicker items={clothes} selected={itemIds} onToggle={toggle} /><label className="outfit-notes">穿搭备注<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="舒适度、搭配感受或下次调整…" /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="outfit-save-success" role="status"><Check size={15} />{message}</p> : null}<div className="outfit-form-actions">{existing ? <button type="button" className="outfit-danger-button" onClick={remove}><Trash2 size={14} />删除记录</button> : <span />}<button type="submit" className="system-primary-button">保存今日穿搭</button></div></section><aside className="paper-panel outfit-today-summary"><Sparkles /><h2>{existing ? "今天已经记录" : "从真实穿着开始"}</h2><p>{existing ? `已记录 ${existing.itemIds.length} 件衣服，可以随时修改。` : "固定搭配只是模板，保存今日穿搭后才会计入穿着次数。"}</p><div><b>{snapshot.outfitLogs.length}</b><small>累计穿搭记录</small></div><div><b>{snapshot.outfitTemplates.length}</b><small>固定搭配</small></div></aside></form>;
}

function TemplateDialog({ template, clothes, onClose, lifeStore }: { template?: OutfitTemplate; clothes: ReturnType<typeof clothingItems>; onClose: () => void; lifeStore: LifeSystemStore }) {
  const [form, setForm] = useState({ name: template?.name ?? "", season: template?.season ?? "", occasion: template?.occasion ?? "", notes: template?.notes ?? "", itemIds: template?.itemIds ?? [] });
  const [error, setError] = useState("");
  const toggle = (id: string) => setForm((current) => ({ ...current, itemIds: current.itemIds.includes(id) ? current.itemIds.filter((entry) => entry !== id) : [...current.itemIds, id] }));
  const submit = (event: FormEvent) => { event.preventDefault(); try { if (template) lifeStore.updateOutfitTemplate(template.id, form); else lifeStore.addOutfitTemplate(form); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : "保存失败"); } };
  return <div className="system-modal-backdrop" onMouseDown={onClose}><form className="quick-capture-sheet outfit-template-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="quick-capture-heading"><div><span>{template ? "编辑固定搭配" : "新建固定搭配"}</span><small>组合常穿单品，之后可以一键记录</small></div><button type="button" aria-label="关闭" onClick={onClose}><X size={18} /></button></div><label>搭配名称<input aria-label="搭配名称" autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如：秋季通勤" /></label><div className="quick-capture-fields"><label>季节<input value={form.season} onChange={(event) => setForm({ ...form, season: event.target.value })} placeholder="春、夏、秋、冬" /></label><label>场景<input value={form.occasion} onChange={(event) => setForm({ ...form, occasion: event.target.value })} placeholder="通勤、周末、旅行…" /></label></div><label>选择衣服<OutfitPicker items={clothes} selected={form.itemIds} onToggle={toggle} labelPrefix="搭配选择" /></label><label>备注<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="system-primary-button" type="submit">保存固定搭配</button></form></div>;
}

function TemplatesPane({ snapshot, inventory, lifeStore, onUse }: { snapshot: LifeSystemSnapshot; inventory: PersonalStoreSnapshot; lifeStore: LifeSystemStore; onUse: (template: OutfitTemplate) => void }) {
  const [dialog, setDialog] = useState<OutfitTemplate | null | undefined>(undefined);
  const clothes = useMemo(() => clothingItems(inventory), [inventory]);
  const itemMap = useMemo(() => new Map(inventory.items.map((item) => [item.id, item])), [inventory.items]);
  const remove = (template: OutfitTemplate) => { if (window.confirm(`删除固定搭配“${template.name}”？已有穿搭记录会保留。`)) lifeStore.deleteOutfitTemplate(template.id); };
  return <section><div className="outfit-pane-heading"><div><h2>固定搭配</h2><p>把常穿组合保存成模板，实际穿着时一键套用。</p></div><button className="system-primary-button" onClick={() => setDialog(null)}><Plus size={15} />新建固定搭配</button></div><div className="outfit-template-grid">{snapshot.outfitTemplates.map((template) => { const used = snapshot.outfitLogs.filter((log) => log.templateId === template.id).length; return <article className="paper-panel outfit-template-card" key={template.id}><OutfitImageGroup itemIds={template.itemIds} itemMap={itemMap} /><div className="outfit-template-title"><div><span>{template.occasion || "日常"}</span><h3>{template.name}</h3><small>{template.season || "全年"} · 已穿 {used} 次</small></div><div><button aria-label={`编辑${template.name}`} onClick={() => setDialog(template)}><Pencil size={14} /></button><button aria-label={`删除${template.name}`} onClick={() => remove(template)}><Trash2 size={14} /></button></div></div><div className="outfit-template-items">{template.itemIds.map((id) => <span key={id}>{itemMap.get(id)?.name ?? "已删除物品"}</span>)}</div>{template.notes ? <p>{template.notes}</p> : null}<button className="outfit-use-template" onClick={() => onUse(template)}>今天穿这套 <ChevronRight size={14} /></button></article>; })}{snapshot.outfitTemplates.length === 0 ? <div className="paper-panel management-empty"><Layers3 /><h3>还没有固定搭配</h3><p>从一套经常穿的组合开始。</p><button onClick={() => setDialog(null)}>创建第一套搭配</button></div> : null}</div>{dialog !== undefined ? <TemplateDialog key={dialog?.id ?? "new"} template={dialog ?? undefined} clothes={clothes} lifeStore={lifeStore} onClose={() => setDialog(undefined)} /> : null}</section>;
}

function OutfitCalendar({ snapshot, inventory, today, onOpenDate }: { snapshot: LifeSystemSnapshot; inventory: PersonalStoreSnapshot; today: string; onOpenDate: (date: string) => void }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const itemMap = useMemo(() => new Map(inventory.items.map((item) => [item.id, item])), [inventory.items]);
  const [year, monthNumber] = month.split("-").map(Number);
  const leading = new Date(year, monthNumber - 1, 1).getDay();
  const days = new Date(year, monthNumber, 0).getDate();
  const cells = [...Array(leading).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  const shiftMonth = (delta: number) => { const next = new Date(year, monthNumber - 1 + delta, 1); setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`); };
  return <section><div className="outfit-calendar-heading"><button aria-label="上个月" onClick={() => shiftMonth(-1)}><ChevronLeft /></button><h2>{year} 年 {monthNumber} 月</h2><button aria-label="下个月" onClick={() => shiftMonth(1)}><ChevronRight /></button></div><div className="outfit-calendar paper-panel"><div className="outfit-calendar-weekdays">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>周{day}</span>)}</div><div className="outfit-calendar-days">{cells.map((day, index) => { if (!day) return <span key={`blank-${index}`} />; const date = `${month}-${String(day).padStart(2, "0")}`; const log = snapshot.outfitLogs.find((entry) => entry.date === date); return <button key={date} className={`${date === today ? "today" : ""} ${log ? "has-outfit" : ""}`} onClick={() => onOpenDate(date)}><b>{day}</b>{log ? <><OutfitImageGroup itemIds={log.itemIds} itemMap={itemMap} limit={2} /><span>{log.itemIds.slice(0, 2).map((id) => itemMap.get(id)?.name).filter(Boolean).join("、")}{log.itemIds.length > 2 ? ` 等${log.itemIds.length}件` : ""}</span></> : null}</button>; })}</div></div></section>;
}

function OutfitStats({ snapshot, inventory }: { snapshot: LifeSystemSnapshot; inventory: PersonalStoreSnapshot }) {
  const itemMap = useMemo(() => new Map(inventory.items.map((item) => [item.id, item])), [inventory.items]);
  const templateMap = useMemo(() => new Map(snapshot.outfitTemplates.map((template) => [template.id, template])), [snapshot.outfitTemplates]);
  const itemCounts = new Map<string, number>(); const templateCounts = new Map<string, number>();
  snapshot.outfitLogs.forEach((log) => { new Set(log.itemIds).forEach((id) => itemCounts.set(id, (itemCounts.get(id) ?? 0) + 1)); if (log.templateId) templateCounts.set(log.templateId, (templateCounts.get(log.templateId) ?? 0) + 1); });
  const rankedItems = [...itemCounts].sort((left, right) => right[1] - left[1]).slice(0, 6);
  const rankedTemplates = [...templateCounts].sort((left, right) => right[1] - left[1]).slice(0, 6);
  const wornItems = new Set(snapshot.outfitLogs.flatMap((log) => log.itemIds)).size;
  const clothesCount = clothingItems(inventory).length;
  return <section><div className="outfit-stat-summary"><div><b>{snapshot.outfitLogs.length}</b><span>累计穿搭</span></div><div><b>{snapshot.outfitTemplates.length}</b><span>固定搭配</span></div><div><b>{clothesCount === 0 ? "0%" : `${Math.round(wornItems / clothesCount * 100)}%`}</b><span>衣橱利用率</span></div></div><div className="outfit-ranking-grid"><section className="paper-panel"><h2>穿着最多的搭配</h2>{rankedTemplates.map(([id, count], index) => { const template = templateMap.get(id); return <div className="outfit-ranking-row" key={id}><i>{index + 1}</i>{template ? <OutfitImageGroup itemIds={template.itemIds} itemMap={itemMap} limit={2} /> : <ClothingImage />}<span><b>{template?.name ?? "已删除搭配"}</b><small>{template?.occasion || "固定搭配"}</small></span><strong>{count} 次</strong></div>; })}{rankedTemplates.length === 0 ? <p className="system-empty">使用固定搭配记录穿着后，这里会生成排行。</p> : null}</section><section className="paper-panel"><h2>穿着最多的单品</h2>{rankedItems.map(([id, count], index) => <div className="outfit-ranking-row" key={id}><i>{index + 1}</i><ClothingImage item={itemMap.get(id)} /><span><b>{itemMap.get(id)?.name ?? "已删除物品"}</b><small>{itemMap.get(id)?.color || itemMap.get(id)?.category}</small></span><strong>{count} 次</strong></div>)}{rankedItems.length === 0 ? <p className="system-empty">保存每日穿搭后，这里会统计单品穿着次数。</p> : null}</section></div></section>;
}

export function OutfitHub({ lifeStore = lifeSystemStore, inventoryStore = personalStore, today = getTodayIso() }: { lifeStore?: LifeSystemStore; inventoryStore?: PersonalStore; today?: string }) {
  const snapshot = useSyncExternalStore(lifeStore.subscribe, lifeStore.getSnapshot, lifeStore.getSnapshot);
  const inventory = useSyncExternalStore(inventoryStore.subscribe, inventoryStore.getSnapshot, inventoryStore.getSnapshot);
  const [section, setSection] = useState<OutfitSection>("today");
  const [todayKey, setTodayKey] = useState("default");
  const [prefillTemplate, setPrefillTemplate] = useState<OutfitTemplate | undefined>();
  const [calendarDate, setCalendarDate] = useState(today);
  const useTemplate = (template: OutfitTemplate) => { setPrefillTemplate(template); setCalendarDate(today); setTodayKey(`${template.id}-${Date.now()}`); setSection("today"); };
  const openDate = (date: string) => { setPrefillTemplate(undefined); setCalendarDate(date); setTodayKey(`date-${date}-${Date.now()}`); setSection("today"); };
  return <div><nav className="outfit-section-tabs" aria-label="穿搭功能">{([['today', '今日穿搭', Shirt], ['templates', '固定搭配', Layers3], ['calendar', '穿搭日历', CalendarDays], ['stats', '穿搭统计', BarChart3]] as const).map(([value, label, Icon]) => <button key={value} className={section === value ? "active" : ""} onClick={() => setSection(value)}><Icon size={16} />{label}</button>)}</nav>{section === "today" ? <TodayOutfit key={todayKey} snapshot={snapshot} inventory={inventory} lifeStore={lifeStore} inventoryStore={inventoryStore} today={calendarDate} initialTemplate={prefillTemplate} /> : null}{section === "templates" ? <TemplatesPane snapshot={snapshot} inventory={inventory} lifeStore={lifeStore} onUse={useTemplate} /> : null}{section === "calendar" ? <OutfitCalendar snapshot={snapshot} inventory={inventory} today={today} onOpenDate={openDate} /> : null}{section === "stats" ? <OutfitStats snapshot={snapshot} inventory={inventory} /> : null}</div>;
}
