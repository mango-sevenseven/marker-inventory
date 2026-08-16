import { useMemo, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Archive, ArrowRight, BookOpen, CalendarCheck, CalendarClock, Check, ChevronLeft, ChevronRight, Clock3, CloudSun, Download, Flag, FolderKanban, Heart, ListChecks, NotebookPen, Pencil, Plus, RotateCcw, Settings2, Shirt, Sparkles, Timer, Trash2, TrendingUp, Wrench } from "lucide-react";
import { lifeSystemStore, getTodayIso } from "@/data/lifeSystemStore";
import { openItemDialog } from "@/features/personal/ItemDialogHost";
import { OutfitHub } from "@/features/outfits/OutfitHub";
import type { LifeEvent, LifeModule, LifeTask, TaskPriority, WorkProject, WorkProjectStatus, WorkSkill } from "@/types/lifeSystem";
import { PageHeading, useQuickCapture } from "@/components/layout/SystemShell";
import { calculateRemainingDays } from "@/lib/taskSchedule";
import { LifeHub, type LifeSection } from "@/features/life/LifeHub";

const moduleMeta: Record<LifeModule, { label: string; color: string }> = {
  work: { label: "工作", color: "#4f779f" }, life: { label: "生活", color: "#648c55" }, study: { label: "学习", color: "#c28a24" },
  outfit: { label: "穿搭", color: "#bd6678" }, review: { label: "回顾", color: "#725791" },
};

const priorityMeta: Record<TaskPriority, { label: string; color: string; order: number }> = {
  high: { label: "高", color: "#b75045", order: 0 },
  medium: { label: "中", color: "#c28a24", order: 1 },
  low: { label: "低", color: "#648c55", order: 2 },
};

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date(`${iso}T12:00:00`));
}

function ModuleTag({ module }: { module: LifeModule }) {
  const meta = moduleMeta[module];
  return <span className="module-tag" style={{ "--module-color": meta.color } as React.CSSProperties}>{meta.label}</span>;
}

function ProjectTag({ project, onClick }: { project?: WorkProject; onClick?: () => void }) {
  if (!project) return null;
  return onClick ? <button className="project-tag" type="button" onClick={onClick}><FolderKanban size={11} />{project.name}</button> : <span className="project-tag"><FolderKanban size={11} />{project.name}</span>;
}

function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return <div className="system-section-title"><h2>{children}</h2>{aside}</div>;
}

function TaskRow({ task, numbered }: { task: LifeTask; numbered?: number }) {
  const changeDone = () => task.done ? lifeSystemStore.toggleTask(task.id) : lifeSystemStore.completeTaskWithRecord(task.id, {});
  return <div className={`system-task-row ${task.done ? "is-done" : ""}`}>
    {numbered ? <span className="task-number" style={{ background: moduleMeta[task.module].color }}>{numbered}</span> : null}
    <button className="task-check" title={task.done ? "取消完成" : "完成并写入实际记录"} aria-label={task.done ? `取消完成${task.title}` : `完成并记录${task.title}`} onClick={changeDone}>{task.done ? <Check size={15} /> : null}</button>
    <span className="task-title">{task.title}</span><ModuleTag module={task.module} />
  </div>;
}

function Metric({ value, label, icon }: { value: string | number; label: string; icon: ReactNode }) {
  return <div className="system-metric"><span>{icon}</span><div><b>{value}</b><small>{label}</small></div></div>;
}

function remainingLabel(dueDate: string, today: string) {
  const days = calculateRemainingDays(dueDate, today);
  if (days === null) return "未设置截止日期";
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return "今天截止";
  return `剩余 ${days} 天`;
}

function WorkTodayPanel({ tasks, events, projects, onOpenProject }: { tasks: LifeTask[]; events: LifeEvent[]; projects: WorkProject[]; onOpenProject: (projectId: string) => void }) {
  const today = getTodayIso();
  const sortedTasks = useMemo(() => [...tasks].sort((left, right) => {
    const priority = priorityMeta[left.priority].order - priorityMeta[right.priority].order;
    return priority || (left.dueDate || "9999").localeCompare(right.dueDate || "9999");
  }), [tasks]);
  return <section className="work-today paper-panel">
    <SectionTitle aside={<span className="progress-caption">{tasks.length} 项未完成 · {events.length} 项日程</span>}>今日待办</SectionTitle>
    <div className="work-today-columns">
      <div className="work-task-list"><h3><ListChecks size={17} />未完成任务</h3>{sortedTasks.map((task) => {
        const remaining = calculateRemainingDays(task.dueDate, today);
        return <article className="work-task-card" key={task.id}>
          <button className="task-check" aria-label={`完成并记录${task.title}`} onClick={() => lifeSystemStore.completeTaskWithRecord(task.id, {})} />
          <div className="work-task-main"><div className="work-task-heading"><b>{task.title}</b><span className="priority-chip" style={{ "--priority-color": priorityMeta[task.priority].color } as React.CSSProperties}><Flag size={11} />{priorityMeta[task.priority].label}</span>{task.projectId ? <ProjectTag project={projects.find((project) => project.id === task.projectId)} onClick={() => onOpenProject(task.projectId)} /> : null}</div><div className="work-progress-line"><div><span style={{ width: `${task.progress}%` }} /></div><select aria-label={`${task.title}进度`} value={task.progress} onChange={(event) => lifeSystemStore.updateTaskProgress(task.id, Number(event.target.value))}>{[0, 25, 50, 75, 100].map((value) => <option value={value} key={value}>{value}%</option>)}</select></div><select className="task-project-select" aria-label={`${task.title}所属项目`} value={task.projectId} onChange={(event) => lifeSystemStore.assignTaskToProject(task.id, event.target.value)}><option value="">无项目</option>{projects.filter((project) => project.status !== "archived" || project.id === task.projectId).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
          <span className={`remaining-days ${remaining !== null && remaining < 0 ? "is-overdue" : remaining === 0 ? "is-today" : ""}`}>{remainingLabel(task.dueDate, today)}</span>
        </article>;
      })}{tasks.length === 0 ? <p className="system-empty">工作任务都完成了。</p> : null}</div>
      <div className="work-schedule-list"><h3><CalendarClock size={17} />今天的日程</h3>{events.map((event) => <article key={event.id}><time>{event.time || "全天"}</time><div><b>{event.title}</b><small>{event.location || "未设置地点"}</small></div></article>)}{events.length === 0 ? <p className="system-empty">今天没有安排工作日程。</p> : null}</div>
    </div>
  </section>;
}

const projectStatusMeta: Record<WorkProjectStatus, string> = { active: "进行中", completed: "已完成", archived: "已归档" };

function ProjectDialog({ project, onClose, onSaved }: { project: WorkProject | null; onClose: () => void; onSaved: (id: string) => void }) {
  const [form, setForm] = useState({ name: project?.name ?? "", startDate: project?.startDate ?? getTodayIso(), endDate: project?.endDate ?? "", goal: project?.goal ?? "", notes: project?.notes ?? "", status: project?.status ?? "active" as WorkProjectStatus });
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      if (project) {
        lifeSystemStore.updateProject(project.id, form);
        onSaved(project.id);
      } else {
        onSaved(lifeSystemStore.addProject(form).id);
      }
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败");
    }
  };
  return <div className="system-modal-backdrop" onMouseDown={onClose}><form className="quick-capture-sheet management-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="quick-capture-heading"><div><span>{project ? "编辑项目" : "新建项目"}</span><small>用项目承接一组指向同一成果的任务</small></div><button type="button" onClick={onClose} aria-label="关闭">×</button></div><label>项目名称<input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如：官网改版" /></label><div className="quick-capture-fields"><label>开始日期<input type="date" value={form.startDate} onInput={(event) => setForm({ ...form, startDate: event.currentTarget.value })} /></label><label>目标日期<input type="date" min={form.startDate} value={form.endDate} onInput={(event) => setForm({ ...form, endDate: event.currentTarget.value })} /></label></div>{project ? <label>项目状态<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as WorkProjectStatus })}><option value="active">进行中</option><option value="completed">已完成</option><option value="archived">已归档</option></select></label> : null}<label>项目目标<textarea value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} placeholder="希望最终交付或改变什么？" /></label><label>补充说明<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="范围、背景或暂时不做的事（选填）" /></label>{error ? <p className="form-error">{error}</p> : null}<button className="system-primary-button" type="submit">保存项目</button></form></div>;
}

function ProjectManager({ selectedProjectId, onSelectProject }: { selectedProjectId: string; onSelectProject: (id: string) => void }) {
  const snapshot = useSyncExternalStore(lifeSystemStore.subscribe, lifeSystemStore.getSnapshot, lifeSystemStore.getSnapshot);
  const [dialogProject, setDialogProject] = useState<WorkProject | null | undefined>(undefined);
  const selectedProject = snapshot.projects.find((project) => project.id === selectedProjectId) ?? snapshot.projects.find((project) => project.status !== "archived") ?? snapshot.projects[0];
  const linkedTasks = selectedProject ? snapshot.tasks.filter((task) => task.projectId === selectedProject.id) : [];
  const availableTasks = selectedProject ? snapshot.tasks.filter((task) => task.module === "work" && task.projectId !== selectedProject.id) : [];
  const progress = selectedProject ? lifeSystemStore.getProjectProgress(selectedProject.id) : 0;
  const removeProject = () => {
    if (!selectedProject || !window.confirm(`删除“${selectedProject.name}”？关联任务会保留并变为无项目。`)) return;
    lifeSystemStore.deleteProject(selectedProject.id);
    onSelectProject("");
  };
  return <section className="project-manager"><div className="management-heading"><div><h2>项目管理</h2><p>项目承接目标，任务负责推进；进度会根据关联任务自动汇总。</p></div><button className="system-primary-button" onClick={() => setDialogProject(null)}><Plus size={15} /> 新建项目</button></div>{snapshot.projects.length === 0 ? <div className="paper-panel management-empty"><FolderKanban /><h3>还没有工作项目</h3><p>当几项任务共同指向一个成果时，再把它们放进项目即可。</p><button onClick={() => setDialogProject(null)}>创建第一个项目</button></div> : <div className="project-layout"><aside className="project-list" aria-label="项目列表">{snapshot.projects.map((project) => <button key={project.id} className={project.id === selectedProject?.id ? "active" : ""} onClick={() => onSelectProject(project.id)}><span><b>{project.name}</b><small>{projectStatusMeta[project.status]}</small></span><strong>{lifeSystemStore.getProjectProgress(project.id)}%</strong></button>)}</aside>{selectedProject ? <article className="paper-panel project-detail"><div className="project-detail-heading"><div><span className={`project-status is-${selectedProject.status}`}>{projectStatusMeta[selectedProject.status]}</span><h2>{selectedProject.name}</h2><p>{selectedProject.goal || "尚未填写项目目标。"}</p></div><div className="project-actions"><button title="编辑项目" aria-label="编辑项目" onClick={() => setDialogProject(selectedProject)}><Pencil /></button><button title="归档项目" aria-label="归档项目" disabled={selectedProject.status === "archived"} onClick={() => lifeSystemStore.updateProject(selectedProject.id, { status: "archived" })}><Archive /></button><button className="danger" title="删除项目" aria-label="删除项目" onClick={removeProject}><Trash2 /></button></div></div><div className="project-progress-summary"><div><span>项目进度</span><b>{progress}%</b></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><small>{linkedTasks.length} 项关联任务 · {linkedTasks.filter((task) => task.done).length} 项已完成</small></div><div className="project-meta"><span><b>开始</b>{selectedProject.startDate || "未设置"}</span><span><b>目标</b>{selectedProject.endDate || "未设置"}</span></div><div className="project-task-heading"><h3>关联任务</h3>{availableTasks.length > 0 ? <select aria-label="关联已有任务" value="" onChange={(event) => event.target.value && lifeSystemStore.assignTaskToProject(event.target.value, selectedProject.id)}><option value="">+ 关联已有任务</option>{availableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select> : null}</div><div className="project-task-list">{linkedTasks.map((task) => <div key={task.id}><button className="task-check" aria-label={`完成并记录${task.title}`} onClick={() => task.done ? lifeSystemStore.toggleTask(task.id) : lifeSystemStore.completeTaskWithRecord(task.id, {})}>{task.done ? <Check size={14} /> : null}</button><span><b>{task.title}</b><small>{task.progress}% · {remainingLabel(task.dueDate, getTodayIso())}</small></span><select aria-label={`调整${task.title}所属项目`} value={task.projectId} onChange={(event) => lifeSystemStore.assignTaskToProject(task.id, event.target.value)}><option value="">移出项目</option>{snapshot.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>)}{linkedTasks.length === 0 ? <p className="system-empty">还没有关联任务，可从右上方选择已有工作任务。</p> : null}</div>{selectedProject.notes ? <div className="project-notes"><b>项目备注</b><p>{selectedProject.notes}</p></div> : null}</article> : null}</div>}{dialogProject !== undefined ? <ProjectDialog key={dialogProject?.id ?? "new"} project={dialogProject} onClose={() => setDialogProject(undefined)} onSaved={onSelectProject} /> : null}</section>;
}

function SkillDialog({ skill, projects, onClose }: { skill: WorkSkill | null; projects: WorkProject[]; onClose: () => void }) {
  const [form, setForm] = useState({ name: skill?.name ?? "", category: skill?.category ?? "", currentLevel: skill?.currentLevel ?? 1, targetLevel: skill?.targetLevel ?? 3, nextAction: skill?.nextAction ?? "", linkedProjectId: skill?.linkedProjectId ?? "" });
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); try { if (skill) lifeSystemStore.updateSkill(skill.id, form); else lifeSystemStore.addSkill(form); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : "保存失败"); } };
  return <div className="system-modal-backdrop" onMouseDown={onClose}><form className="quick-capture-sheet management-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="quick-capture-heading"><div><span>{skill ? "编辑技能" : "添加技能"}</span><small>记录能力现状和下一次刻意练习</small></div><button type="button" onClick={onClose} aria-label="关闭">×</button></div><div className="quick-capture-fields"><label>技能名称<input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如：需求分析" /></label><label>分类<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="产品、设计、沟通…" /></label></div><div className="quick-capture-fields"><label>当前等级<select value={form.currentLevel} onChange={(event) => setForm({ ...form, currentLevel: Number(event.target.value) })}>{[1,2,3,4,5].map((level) => <option key={level} value={level}>L{level}</option>)}</select></label><label>目标等级<select value={form.targetLevel} onChange={(event) => setForm({ ...form, targetLevel: Number(event.target.value) })}>{[1,2,3,4,5].map((level) => <option key={level} value={level}>L{level}</option>)}</select></label></div><label>关联项目<select value={form.linkedProjectId} onChange={(event) => setForm({ ...form, linkedProjectId: event.target.value })}><option value="">暂不关联</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>下一步行动<textarea value={form.nextAction} onChange={(event) => setForm({ ...form, nextAction: event.target.value })} placeholder="下一次具体要练习什么？" /></label>{error ? <p className="form-error">{error}</p> : null}<button className="system-primary-button" type="submit">保存技能</button></form></div>;
}

function SkillManager() {
  const snapshot = useSyncExternalStore(lifeSystemStore.subscribe, lifeSystemStore.getSnapshot, lifeSystemStore.getSnapshot);
  const [dialogSkill, setDialogSkill] = useState<WorkSkill | null | undefined>(undefined);
  return <section><div className="management-heading"><div><h2>技能管理</h2><p>技能不是清单，而是通过项目和下一步行动持续积累的能力。</p></div><button className="system-primary-button" onClick={() => setDialogSkill(null)}><Plus size={15} /> 添加技能</button></div>{snapshot.skills.length === 0 ? <div className="paper-panel management-empty"><Wrench /><h3>记录第一项核心技能</h3><p>从当前工作中最常使用、也最希望提升的能力开始。</p><button onClick={() => setDialogSkill(null)}>添加技能</button></div> : <div className="skill-list">{snapshot.skills.map((skill) => { const project = snapshot.projects.find((entry) => entry.id === skill.linkedProjectId); return <article className="paper-panel skill-row" key={skill.id}><div className="skill-level"><span>L{skill.currentLevel}</span><small>目标 L{skill.targetLevel}</small></div><div><div className="skill-title"><h3>{skill.name}</h3>{skill.category ? <span>{skill.category}</span> : null}</div><div className="skill-level-track">{[1,2,3,4,5].map((level) => <i key={level} className={level <= skill.currentLevel ? "filled" : ""} />)}</div><p>{skill.nextAction || "还没有设置下一步行动。"}</p>{project ? <ProjectTag project={project} /> : null}</div><div className="skill-actions"><button aria-label={`编辑${skill.name}`} onClick={() => setDialogSkill(skill)}><Pencil /></button><button className="danger" aria-label={`删除${skill.name}`} onClick={() => window.confirm(`删除技能“${skill.name}”？`) && lifeSystemStore.deleteSkill(skill.id)}><Trash2 /></button></div></article>; })}</div>}{dialogSkill !== undefined ? <SkillDialog key={dialogSkill?.id ?? "new"} skill={dialogSkill} projects={snapshot.projects} onClose={() => setDialogSkill(undefined)} /> : null}</section>;
}

export function TodayPage() {
  const snapshot = useSyncExternalStore(lifeSystemStore.subscribe, lifeSystemStore.getSnapshot, lifeSystemStore.getSnapshot);
  const { openQuickCapture } = useQuickCapture();
  const navigate = useNavigate();
  const today = getTodayIso();
  const focuses = snapshot.tasks.filter((task) => task.date === today && task.important).slice(0, 3);
  const todayEvents = snapshot.events.filter((event) => event.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const todayRecords = snapshot.records.filter((record) => record.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const todayTimeline = [
    ...todayEvents.map((entry) => ({ ...entry, calendarKind: "event" as const, detail: entry.location || "计划日程" })),
    ...todayRecords.map((entry) => ({ ...entry, calendarKind: "record" as const, detail: entry.durationMinutes ? `实际 ${entry.durationMinutes} 分钟` : "实际记录" })),
  ].sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = [...snapshot.events].filter((event) => event.date > today).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 4);
  const done = snapshot.tasks.filter((task) => task.done).length;
  const progress = Math.round(done / Math.max(1, snapshot.tasks.length) * 100);

  return <div className="today-layout">
    <section className="today-primary">
      <div className="today-greeting"><div><span>{dateLabel(today)}</span><h1>早上好，愿你今天一切顺利！</h1><p>今天，先完成最重要的三件事。</p></div><CloudSun size={54} strokeWidth={1.4} /></div>
      <div className="today-capture-actions"><button onClick={() => openQuickCapture(undefined, "task")}><ListChecks />添加任务</button><button onClick={() => openQuickCapture(undefined, "event")}><CalendarClock />添加日程</button><button className="actual" onClick={() => openQuickCapture(undefined, "record")}><NotebookPen />记录发生</button></div>
      <section className="paper-panel focus-panel"><SectionTitle aside={<button className="text-action" onClick={() => openQuickCapture(undefined, "task")}>添加重点 <Plus size={14} /></button>}>今日计划</SectionTitle>{focuses.map((task, index) => <TaskRow key={task.id} task={task} numbered={index + 1} />)}{focuses.length === 0 ? <p className="system-empty">今天的重点都完成了，做得很好。</p> : null}</section>
      <section className="paper-panel timeline-panel"><SectionTitle aside={<button className="text-action" onClick={() => navigate("/calendar")}>查看日历 <ArrowRight size={14} /></button>}>今日时间线</SectionTitle><div className="system-timeline">{todayTimeline.map((entry) => <div className={`timeline-event ${entry.calendarKind === "record" ? "is-actual" : "is-plan"}`} key={`${entry.calendarKind}-${entry.id}`} style={{ "--module-color": moduleMeta[entry.module].color } as React.CSSProperties}><time>{entry.time || "全天"}</time><span className="timeline-dot" /><div><b>{entry.title}</b><small>{entry.detail}</small></div><span className="timeline-kind">{entry.calendarKind === "record" ? "实际" : "计划"}</span><ModuleTag module={entry.module} /></div>)}</div></section>
      <section className="paper-panel weekly-strip"><SectionTitle aside={<span className="progress-caption">已完成 {done}/{snapshot.tasks.length}</span>}>本周进度</SectionTitle><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="weekly-summary"><b>{progress}%</b><span>保持节奏，也给临时变化留一点余地。</span></div></section>
    </section>
    <aside className="today-companion">
      <section><SectionTitle aside={<Link to="/calendar" className="text-action">全部日程 <ArrowRight size={14} /></Link>}>即将到来</SectionTitle><div className="upcoming-list">{upcoming.map((event) => <div key={event.id} className="upcoming-item" style={{ "--module-color": moduleMeta[event.module].color } as React.CSSProperties}><span className="upcoming-dot" /><div><time>{dateLabel(event.date)} · {event.time}</time><b>{event.title}</b><small>{event.location}</small></div><ModuleTag module={event.module} /></div>)}</div></section>
      <section className="review-note"><NotebookPen size={35} /><h2>开始周回顾</h2><p>花 15 分钟回顾本周的得与失，为下周重新校准节奏。</p><button onClick={() => navigate("/review")}>开始周回顾 <ArrowRight size={16} /></button></section>
    </aside>
  </div>;
}

const calendarFilters: Array<[LifeModule | "all", string]> = [["all", "全部"], ["work", "工作"], ["life", "生活"], ["study", "学习"], ["outfit", "穿搭"], ["review", "回顾"]];
type CalendarContentFilter = "all" | "plan" | "actual";

function UnifiedCalendar({ moduleFilter }: { moduleFilter?: LifeModule }) {
  const snapshot = useSyncExternalStore(lifeSystemStore.subscribe, lifeSystemStore.getSnapshot, lifeSystemStore.getSnapshot);
  const { openQuickCapture } = useQuickCapture();
  const [filter, setFilter] = useState<LifeModule | "all">(moduleFilter ?? "all");
  const [contentFilter, setContentFilter] = useState<CalendarContentFilter>("all");
  const [selectedDate, setSelectedDate] = useState(getTodayIso());
  const [cursor, setCursor] = useState(() => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const activeModule = moduleFilter ?? filter;
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => index - firstWeekday + 1);
  const pad = (value: number) => String(value).padStart(2, "0");
  const entries = useMemo(() => {
    const matchesModule = (entry: { module: LifeModule }) => activeModule === "all" || entry.module === activeModule;
    const events = contentFilter === "actual" ? [] : snapshot.events.filter(matchesModule).map((entry) => ({ ...entry, calendarKind: "event" as const }));
    const tasks = contentFilter === "actual" ? [] : snapshot.tasks.filter(matchesModule).map((entry) => ({ ...entry, calendarKind: "task" as const }));
    const records = contentFilter === "plan" ? [] : snapshot.records.filter(matchesModule).map((entry) => ({ ...entry, calendarKind: "record" as const }));
    const itineraries = contentFilter === "actual" || (activeModule !== "all" && activeModule !== "life") ? [] : snapshot.itineraries.map((entry) => ({ ...entry, module: "life" as const, calendarKind: "travel" as const }));
    return [...events, ...tasks, ...records, ...itineraries];
  }, [activeModule, contentFilter, snapshot]);
  const selectedEntries = entries.filter((entry) => entry.date === selectedDate).sort((a, b) => ("time" in a ? a.time : "").localeCompare("time" in b ? b.time : ""));
  const captureModule = activeModule === "all" ? "life" : activeModule;
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));

  return <div className="unified-calendar">
    <div className="calendar-toolbar"><div className="calendar-nav"><button aria-label="上个月" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft /></button><h2>{year} 年 {month + 1} 月</h2><button aria-label="下个月" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight /></button></div>{moduleFilter ? <strong className="calendar-fixed-filter" style={{ "--module-color": moduleMeta[moduleFilter].color } as React.CSSProperties}>{moduleMeta[moduleFilter].label}日历</strong> : <div className="filter-tabs module-filter-tabs">{calendarFilters.map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div>}</div>
    <div className="calendar-content-filter"><span>显示：</span>{([['all', '全部'], ['plan', '计划'], ['actual', '实际记录']] as Array<[CalendarContentFilter, string]>).map(([value, label]) => <button key={value} className={contentFilter === value ? "active" : ""} onClick={() => setContentFilter(value)}>{label}</button>)}</div>
    <div className="calendar-grid"><div className="calendar-weekdays">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>周{day}</span>)}</div><div className="calendar-days">{cells.map((day, index) => {
      const valid = day > 0 && day <= days;
      const iso = valid ? `${year}-${pad(month + 1)}-${pad(day)}` : "";
      const dayEntries = entries.filter((entry) => entry.date === iso).slice(0, 4);
      return <button type="button" key={index} disabled={!valid} onClick={() => setSelectedDate(iso)} className={`calendar-cell ${iso === getTodayIso() ? "is-today" : ""} ${iso === selectedDate ? "is-selected" : ""} ${valid ? "" : "is-outside"}`}><b>{valid ? day : ""}</b>{dayEntries.map((entry) => { const project = entry.calendarKind === "task" ? projectById.get(entry.projectId) : undefined; return <span className={`calendar-entry is-${entry.calendarKind}`} key={`${entry.calendarKind}-${entry.id}`} style={{ "--module-color": moduleMeta[entry.module].color } as React.CSSProperties}>{"time" in entry && entry.time ? `${entry.time} ` : ""}{entry.title}{project ? ` · ${project.name}` : ""}</span>; })}</button>;
    })}</div></div>
    <section className="calendar-day-detail paper-panel"><SectionTitle aside={<div className="calendar-add-actions"><button onClick={() => openQuickCapture(captureModule, "task", selectedDate)}>+ 任务</button><button onClick={() => openQuickCapture(captureModule, "event", selectedDate)}>+ 日程</button><button className="actual" onClick={() => openQuickCapture(captureModule, "record", selectedDate)}>+ 记录发生</button></div>}>{dateLabel(selectedDate)}</SectionTitle>
      {selectedEntries.length > 0 ? <div className="calendar-detail-list">{selectedEntries.map((entry) => <div key={`${entry.calendarKind}-${entry.id}`} className={`calendar-detail-row is-${entry.calendarKind}`} style={{ "--module-color": moduleMeta[entry.module].color } as React.CSSProperties}><time>{"time" in entry && entry.time ? entry.time : "全天"}</time><span className="detail-kind">{entry.calendarKind === "record" ? "实际" : entry.calendarKind === "event" ? "日程" : entry.calendarKind === "travel" ? "旅行" : "任务"}</span><div><b>{entry.title}</b>{entry.calendarKind === "record" ? <small>{entry.durationMinutes ? `实际 ${entry.durationMinutes} 分钟 · ` : ""}{entry.content || "独立记录"}</small> : entry.calendarKind === "task" ? <small>{entry.done ? "已完成并写入记录" : "等待完成"}</small> : entry.calendarKind === "travel" ? <small>{entry.location || entry.notes || "旅行行程"}</small> : <small>{entry.location || "未设置地点"}</small>}</div><div className="detail-tags">{entry.calendarKind === "task" ? <ProjectTag project={projectById.get(entry.projectId)} /> : null}<ModuleTag module={entry.module} /></div></div>)}</div> : <p className="system-empty">这一天还没有计划或记录。可以从这里安排，也可以补记实际发生的事情。</p>}
    </section>
  </div>;
}

export function CalendarPage() {
  return <div><PageHeading title="日历" description="计划和实际记录共用一条时间轴：过去留下事实，未来承载安排。" /><UnifiedCalendar /></div>;
}

function ModuleTaskPage({ module, title, description, children }: { module: LifeModule; title: string; description: string; children?: ReactNode }) {
  const snapshot = useSyncExternalStore(lifeSystemStore.subscribe, lifeSystemStore.getSnapshot, lifeSystemStore.getSnapshot);
  const { openQuickCapture } = useQuickCapture();
  const tasks = snapshot.tasks.filter((task) => task.module === module);
  return <div><PageHeading title={title} description={description} action={<button className="system-primary-button" onClick={() => openQuickCapture(module)}><Plus size={16} /> 添加记录</button>} />{children}<div className="module-two-column"><section className="paper-panel"><SectionTitle aside={<span className="progress-caption">{tasks.filter((task) => task.done).length}/{tasks.length} 已完成</span>}>任务清单</SectionTitle>{tasks.map((task) => <TaskRow key={task.id} task={task} />)}{tasks.length === 0 ? <p className="system-empty">还没有记录，先添加一条吧。</p> : null}</section><section className="paper-panel module-next"><SectionTitle>接下来</SectionTitle>{snapshot.events.filter((event) => event.module === module).slice(0, 4).map((event) => <div className="compact-event" key={event.id}><span>{event.date.slice(5)}<b>{event.time}</b></span><div><b>{event.title}</b><small>{event.location}</small></div></div>)}</section></div></div>;
}

export function WorkPage() {
  const snapshot = useSyncExternalStore(lifeSystemStore.subscribe, lifeSystemStore.getSnapshot, lifeSystemStore.getSnapshot);
  const { openQuickCapture } = useQuickCapture();
  const tasks = snapshot.tasks.filter((task) => task.module === "work");
  const unfinishedTasks = tasks.filter((task) => !task.done);
  const todayEvents = snapshot.events.filter((event) => event.module === "work" && event.date === getTodayIso()).sort((left, right) => left.time.localeCompare(right.time));
  const [activeSection, setActiveSection] = useState<"today" | "calendar" | "projects" | "skills">("today");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const openProject = (projectId: string) => { setSelectedProjectId(projectId); setActiveSection("projects"); };
  return <div><PageHeading title="工作" description="工作计划和实际记录在同一份日历中沉淀。" action={<button className="system-primary-button" onClick={() => openQuickCapture("work", "record")}><Plus size={16} /> 记录工作</button>} />
    <nav className="work-section-tabs" aria-label="工作板块">{([['today', '今日待办', ListChecks], ['calendar', '工作日历', CalendarClock], ['projects', '项目管理', FolderKanban], ['skills', '技能管理', Wrench]] as const).map(([value, label, Icon]) => <button key={value} className={activeSection === value ? "active" : ""} onClick={() => setActiveSection(value)}><Icon size={16} />{label}</button>)}</nav>
    {activeSection === "today" ? <WorkTodayPanel tasks={unfinishedTasks} events={todayEvents} projects={snapshot.projects} onOpenProject={openProject} /> : null}
    {activeSection === "calendar" ? <UnifiedCalendar moduleFilter="work" /> : null}
    {activeSection === "projects" ? <ProjectManager selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} /> : null}
    {activeSection === "skills" ? <SkillManager /> : null}
  </div>;
}

export function LifePage({ section = "items" }: { section?: LifeSection }) {
  const { openQuickCapture } = useQuickCapture();
  return <div><PageHeading title="生活" description="物品、日记和旅行共同组成生活档案，并在生活日历中形成一条真实时间线。" action={<button className="system-primary-button" onClick={() => openQuickCapture("life", "record")}><Plus size={16} /> 记录生活</button>} /><LifeHub section={section} calendar={<UnifiedCalendar moduleFilter="life" />} /></div>;
}

export function StudyPage() {
  return <ModuleTaskPage module="study" title="学习" description="从目标到课程、任务和复习，把投入慢慢沉淀成掌握。"><div className="study-course"><BookOpen /><div><span>当前学习项目</span><h2>英语能力提升</h2><p>本周目标：完成听力训练与 250 个单词复习</p><div className="progress-track"><span style={{ width: "64%" }} /></div></div><b>64%</b></div><div className="metric-row"><Metric value="4.2h" label="本周学习" icon={<Timer />} /><Metric value="6 天" label="连续学习" icon={<TrendingUp />} /><Metric value="3" label="待复习主题" icon={<RotateCcw />} /></div></ModuleTaskPage>;
}

export function OutfitsPage() {
  return <div><PageHeading title="穿搭" description="衣橱直接读取物品数据，用天气、场景与历史穿着帮助你做选择。" action={<div className="outfit-heading-actions"><button className="system-primary-button" onClick={() => openItemDialog(undefined, { category: "衣服", lockCategory: true, title: "添加衣服" })}><Plus size={16} /> 添加衣服</button><Link className="outfit-manage-link" to="/life/items/library"><Shirt size={15} /> 管理衣橱</Link></div>} />
    <OutfitHub />
  </div>;
}

export function ReviewPage() {
  const snapshot = useSyncExternalStore(lifeSystemStore.subscribe, lifeSystemStore.getSnapshot, lifeSystemStore.getSnapshot);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ highlight: "", reflection: "", nextFocus: "" });
  const completed = snapshot.tasks.filter((task) => task.done).length;
  const actualMinutes = snapshot.records.reduce((sum, record) => sum + (record.durationMinutes ?? 0), 0);
  const submit = (event: FormEvent) => { event.preventDefault(); lifeSystemStore.addReview({ period: `截至 ${getTodayIso()} 的一周`, ...form }); setSaved(true); };
  return <div><PageHeading title="回顾" description="日历告诉你发生了什么，回顾帮助你理解它，并把调整重新放回日历。" />
    <div className="review-stats"><Metric value={`${completed}/${snapshot.tasks.length}`} label="任务完成" icon={<CalendarCheck />} /><Metric value={`${snapshot.records.length}`} label="实际记录" icon={<Clock3 />} /><Metric value={`${Math.round(actualMinutes / 6) / 10}h`} label="已记录实际用时" icon={<NotebookPen />} /></div>
    <section className="review-calendar-summary paper-panel"><SectionTitle>日历自动摘要</SectionTitle><p>本周期共有 <b>{snapshot.events.length}</b> 项计划日程、<b>{snapshot.records.length}</b> 条实际记录。回顾用于解释这些事实，而不再重复维护另一份流水。</p></section>
    <form className="review-form paper-panel" onSubmit={submit}><SectionTitle aside={<span className="progress-caption">约 10 分钟</span>}>本周回顾</SectionTitle><label><span>这周最值得肯定的一件事</span><textarea required value={form.highlight} onChange={(event) => setForm({ ...form, highlight: event.target.value })} placeholder="写下成果、进步或一个温暖的瞬间…" /></label><label><span>哪些地方没有按预期发生？</span><textarea required value={form.reflection} onChange={(event) => setForm({ ...form, reflection: event.target.value })} placeholder="记录原因，而不是责备自己…" /></label><label><span>下周最重要的一个关注点</span><textarea required value={form.nextFocus} onChange={(event) => setForm({ ...form, nextFocus: event.target.value })} placeholder="它会成为下周计划的起点…" /></label><button className="system-primary-button" type="submit">保存回顾并生成下周重点</button>{saved ? <p className="review-success"><Check size={16} /> 回顾已保存，下周重点已经准备好。</p> : null}</form>
  </div>;
}

export function SettingsPage() {
  const navigate = useNavigate();
  return <div><button className="life-subview-back" onClick={() => navigate("/life/items")}><ChevronLeft size={14} /> 返回我的物品</button><PageHeading title="设置" description="管理我的物品字段、数据与使用偏好。" /><div className="settings-list"><Link to="/life/items/settings"><Settings2 /><span><b>物品字段与分类</b><small>管理物品的公共属性和分类专有字段</small></span><ArrowRight /></Link><Link to="/life/items/export"><Download /><span><b>导入、导出与备份</b><small>CSV 数据交换与 JSON 完整备份</small></span><ArrowRight /></Link><label><Heart /><span><b>温和提醒</b><small>每天只突出最重要的提醒</small></span><input type="checkbox" defaultChecked /></label><label><Sparkles /><span><b>减少动态效果</b><small>减少翻转和过渡动画</small></span><input type="checkbox" /></label></div></div>;
}
