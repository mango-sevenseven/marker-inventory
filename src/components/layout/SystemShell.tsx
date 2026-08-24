import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode, type TouchEvent } from "react";
import { Menu, Plus, Search, X } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router";
import { navigation } from "@/config/navigation";
import { lifeSystemStore, getTodayIso } from "@/data/lifeSystemStore";
import type { LifeModule, TaskPriority } from "@/types/lifeSystem";
import { ItemDialogHost } from "@/features/personal/ItemDialogHost";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export type CaptureKind = "task" | "event" | "record";
interface QuickCaptureApi { openQuickCapture: (module?: LifeModule, kind?: CaptureKind, date?: string) => void }
const QuickCaptureContext = createContext<QuickCaptureApi>({ openQuickCapture: () => undefined });
export const useQuickCapture = () => useContext(QuickCaptureContext);

const moduleOptions: Array<[LifeModule, string]> = [
  ["work", "工作"], ["life", "生活"], ["study", "学习"], ["outfit", "穿搭"], ["review", "回顾"],
];

const captureLabels: Record<CaptureKind, { label: string; hint: string }> = {
  task: { label: "添加任务", hint: "准备完成什么" },
  event: { label: "添加日程", hint: "计划什么时候发生" },
  record: { label: "记录发生", hint: "刚刚实际发生了什么" },
};

function QuickCapture({ open, initialModule, initialKind, initialDate, onClose }: { open: boolean; initialModule: LifeModule; initialKind: CaptureKind; initialDate: string; onClose: () => void }) {
  const snapshot = useSyncExternalStore(lifeSystemStore.subscribe, lifeSystemStore.getSnapshot, lifeSystemStore.getSnapshot);
  const [title, setTitle] = useState("");
  const [module, setModule] = useState<LifeModule>(initialModule);
  const [kind, setKind] = useState<CaptureKind>(initialKind);
  const [date, setDate] = useState(initialDate);
  const [dueDate, setDueDate] = useState(initialDate);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [projectId, setProjectId] = useState("");
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [duration, setDuration] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      if (kind === "task") lifeSystemStore.addTask({ title, module, date, dueDate, priority, projectId: module === "work" ? projectId : "" });
      if (kind === "event") lifeSystemStore.addEvent({ title, module, date, time, location: "" });
      if (kind === "record") lifeSystemStore.addRecord({ title, module, date, time, durationMinutes: duration ? Number(duration) : null, content });
      setTitle(""); setError(""); onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败");
    }
  };

  if (!open) return null;
  return (
    <div className="system-modal-backdrop" onMouseDown={onClose}>
      <form className="quick-capture-sheet" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="quick-capture-heading"><div><span>{captureLabels[kind].label}</span><small>{captureLabels[kind].hint}</small></div><button type="button" onClick={onClose} aria-label="关闭"><X size={20} /></button></div>
        <div className="capture-kind-tabs" aria-label="添加类型">{(Object.keys(captureLabels) as CaptureKind[]).map((value) => <button type="button" key={value} className={kind === value ? "active" : ""} onClick={() => setKind(value)}>{captureLabels[value].label}</button>)}</div>
        <label>内容<Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "record" ? "刚刚发生了什么？" : "写下标题…"} /></label>
        <div className="quick-capture-fields"><label>归属模块<Select value={module} onChange={(event) => setModule(event.target.value as LifeModule)}>{moduleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label><label>{kind === "task" ? "计划日期" : "日期"}<Input type="date" value={date} onChange={(event) => { setDate(event.target.value); if (kind === "task" && dueDate < event.target.value) setDueDate(event.target.value); }} /></label></div>
        {kind === "task" ? <><div className="quick-capture-fields"><label>截止日期<Input type="date" min={date} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label>优先级<Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}><option value="high">高优先级</option><option value="medium">中优先级</option><option value="low">低优先级</option></Select></label></div>{module === "work" ? <label>所属项目（选填）<Select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">无项目</option>{snapshot.projects.filter((project) => project.status !== "archived").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</Select></label> : null}</> : null}
        {kind !== "task" ? <div className="quick-capture-fields"><label>时间<Input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>{kind === "record" ? <label>实际用时（分钟）<Input type="number" min="0" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="选填" /></label> : <span />}</div> : null}
        {kind === "record" ? <label>补充说明<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="结果、感受或值得记住的细节（选填）" /></label> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="system-primary-button" type="submit">保存到日历</button>
      </form>
    </div>
  );
}

function Brand() {
  return <div className="system-brand"><span>有序生活</span><small>从一个小小的决定开始。</small></div>;
}

export function SystemShell() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerGesture = useRef<{ x: number; y: number; mode: "open" | "close" } | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureModule, setCaptureModule] = useState<LifeModule>("life");
  const [captureKind, setCaptureKind] = useState<CaptureKind>("record");
  const [captureDate, setCaptureDate] = useState(getTodayIso());
  const openQuickCapture = (module: LifeModule = "life", kind: CaptureKind = "record", date = getTodayIso()) => { setCaptureModule(module); setCaptureKind(kind); setCaptureDate(date); setCaptureOpen(true); };
  const isItemSettings = location.pathname === "/settings";
  const childPage = navigation.flatMap((item) => (item.children ?? []).map((child) => ({ ...child, module: item.module }))).find((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));
  const page = isItemSettings ? navigation.find((item) => item.path === "/life") : childPage ?? navigation.find((item) => item.path === location.pathname) ?? navigation.find((item) => item.path !== "/" && location.pathname.startsWith(`${item.path}/`));

  useEffect(() => {
    if (!menuOpen) return;
    document.body.classList.add("system-menu-open");
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("system-menu-open");
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const startDrawerGesture = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    const target = event.target instanceof Element ? event.target : null;
    const mode = menuOpen ? "close" : "open";
    const canStart = menuOpen
      ? Boolean(target?.closest("#system-navigation"))
      : touch.clientX <= 24;
    drawerGesture.current = canStart ? { x: touch.clientX, y: touch.clientY, mode } : null;
  };

  const finishDrawerGesture = (event: TouchEvent<HTMLDivElement>) => {
    const start = drawerGesture.current;
    drawerGesture.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const horizontalDistance = touch.clientX - start.x;
    const verticalDistance = touch.clientY - start.y;
    if (Math.abs(horizontalDistance) < 56 || Math.abs(horizontalDistance) <= Math.abs(verticalDistance) * 1.2) return;
    if (start.mode === "open" && horizontalDistance > 0) setMenuOpen(true);
    if (start.mode === "close" && horizontalDistance < 0) setMenuOpen(false);
  };

  return (
    <QuickCaptureContext.Provider value={{ openQuickCapture }}>
      <div className="system-app" onTouchStart={startDrawerGesture} onTouchEnd={finishDrawerGesture} onTouchCancel={() => { drawerGesture.current = null; }}>
        <aside id="system-navigation" className={`system-nav ${menuOpen ? "is-open" : ""}`}>
          <div className="system-nav-header">
            <Brand />
            <button className="system-nav-close" onClick={() => setMenuOpen(false)} aria-label="关闭侧边导航"><X size={21} /></button>
          </div>
          <nav aria-label="主导航">
            {navigation.map(({ path, label, icon: Icon, accent, children }) => <div className={`system-nav-group ${children ? "has-children" : ""}`} key={path}><NavLink to={path} end={path === "/"} className={({ isActive }) => isActive || (isItemSettings && path === "/life") ? "active" : undefined} onClick={() => setMenuOpen(false)} style={{ "--nav-accent": accent } as React.CSSProperties}><Icon size={21} strokeWidth={2.1} /><span>{label}</span></NavLink>{children ? <div className="system-subnav" role="group" aria-label={`${label}子菜单`}>{children.map(({ path: childPath, label: childLabel, icon: ChildIcon }) => <NavLink key={childPath} to={childPath} className={({ isActive }) => isActive || (isItemSettings && childPath === "/life/items") ? "active" : undefined} onClick={() => setMenuOpen(false)}><ChildIcon size={15} /><span>{childLabel}</span></NavLink>)}</div> : null}</div>)}
          </nav>
          <div className="system-nav-note"><b>今天也不用完成所有事</b><span>先照顾最重要的三件。</span></div>
        </aside>
        <div className="system-workspace">
          <header className="system-topbar">
            <button className="system-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "关闭导航" : "打开导航"} aria-controls="system-navigation" aria-expanded={menuOpen}><Menu size={22} /></button>
            <div className="system-mobile-title">{page?.label ?? "有序生活"}</div>
            <div className="system-search"><Search size={17} /><input aria-label="全局搜索" placeholder="搜索任务、日程或物品…" /></div>
            <button className="quick-add-button" onClick={() => openQuickCapture(page?.module, "record")}><Plus size={18} /> <span>记录发生</span></button>
          </header>
          <main className="system-main"><Outlet /></main>
        </div>
        {menuOpen ? <button className="system-nav-scrim" aria-label="关闭导航遮罩" onClick={() => setMenuOpen(false)} /> : null}
        <QuickCapture key={`${captureOpen}-${captureModule}-${captureKind}-${captureDate}`} open={captureOpen} initialModule={captureModule} initialKind={captureKind} initialDate={captureDate} onClose={() => setCaptureOpen(false)} />
        <ItemDialogHost />
      </div>
    </QuickCaptureContext.Provider>
  );
}

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="system-page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
