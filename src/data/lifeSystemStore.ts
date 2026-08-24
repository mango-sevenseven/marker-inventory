import type { DailyRecord, LifeEvent, LifeModule, LifeSystemSnapshot, LifeTask, OutfitLog, OutfitTemplate, ReviewEntry, TaskPriority, TravelItineraryEntry, TravelTrip, WorkProject, WorkSkill } from "@/types/lifeSystem";

export const LIFE_SYSTEM_STORAGE_KEY = "ordered_life_system_v1";

function shiftDate(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getTodayIso() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function seed(today: string): LifeSystemSnapshot {
  const tasks: LifeTask[] = [
    { id: "task-plan", title: "完成项目方案初稿", module: "work", date: today, dueDate: shiftDate(today, 2), priority: "high", progress: 65, time: "", location: "", important: true, done: false, projectId: "" },
    { id: "task-yoga", title: "晚饭后瑜伽 30 分钟", module: "life", date: today, dueDate: today, priority: "medium", progress: 0, time: "", location: "家", important: true, done: false, projectId: "" },
    { id: "task-english", title: "复习英语单词 50 个", module: "study", date: today, dueDate: shiftDate(today, 1), priority: "medium", progress: 20, time: "", location: "", important: true, done: false, projectId: "" },
    { id: "task-mail", title: "回复邮件并整理文档", module: "work", date: today, dueDate: today, priority: "low", progress: 100, time: "", location: "线上", important: false, done: true, projectId: "" },
    { id: "task-wardrobe", title: "整理换季衣橱", module: "outfit", date: shiftDate(today, 3), dueDate: shiftDate(today, 5), priority: "low", progress: 0, time: "", location: "家", important: false, done: false, projectId: "" },
  ];
  const events: LifeEvent[] = [
    { id: "event-morning", title: "晨间拉伸", module: "life", date: today, time: "06:30", location: "家" },
    { id: "event-standup", title: "项目例会", module: "work", date: today, time: "08:30", location: "线上" },
    { id: "event-review", title: "需求评审", module: "work", date: today, time: "10:30", location: "会议室 A" },
    { id: "event-walk", title: "午餐与散步", module: "life", date: today, time: "12:30", location: "公司周边" },
    { id: "event-deep", title: "深度专注：学习新知识", module: "study", date: today, time: "14:00", location: "图书馆" },
    { id: "event-dinner", title: "和朋友晚餐", module: "life", date: shiftDate(today, 1), time: "19:30", location: "外婆家" },
    { id: "event-test", title: "英语听力考试", module: "study", date: shiftDate(today, 2), time: "10:00", location: "线上" },
    { id: "event-review-week", title: "季度复盘", module: "review", date: shiftDate(today, 4), time: "20:00", location: "家" },
  ];
  const records: DailyRecord[] = [
    { id: "record-work-output", title: "完成首页信息架构", module: "work", date: today, time: "09:10", durationMinutes: 95, content: "确定了核心页面与导航结构。", linkedTaskId: "", linkedEventId: "", linkedTripId: "", mood: "", location: "", tags: [], createdAt: `${today}T09:10:00` },
    { id: "record-life-lunch", title: "午餐后散步", module: "life", date: today, time: "12:45", durationMinutes: 25, content: "天气不错，绕公司走了一圈。", linkedTaskId: "", linkedEventId: "event-walk", linkedTripId: "", mood: "轻松", location: "公司周边", tags: ["散步"], createdAt: `${today}T12:45:00` },
    { id: "record-work-feedback", title: "临时处理客户反馈", module: "work", date: today, time: "16:20", durationMinutes: 45, content: "计划外事项，已确认问题并回复。", linkedTaskId: "", linkedEventId: "", linkedTripId: "", mood: "", location: "", tags: [], createdAt: `${today}T16:20:00` },
    { id: "record-life-reading", title: "睡前阅读", module: "life", date: today, time: "21:30", durationMinutes: 30, content: "读完了正在看的章节。", linkedTaskId: "", linkedEventId: "", linkedTripId: "", mood: "平静", location: "家", tags: ["阅读"], createdAt: `${today}T21:30:00` },
  ];
  return { version: 1, tasks, events, records, reviews: [], projects: [], skills: [], trips: [], itineraries: [], outfitTemplates: [], outfitLogs: [] };
}

function load(storage: Storage | undefined, today: string) {
  if (!storage) return seed(today);
  try {
    const raw = storage.getItem(LIFE_SYSTEM_STORAGE_KEY);
    if (!raw) return seed(today);
    const parsed = JSON.parse(raw) as LifeSystemSnapshot;
    if (parsed.version !== 1 || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.events)) return seed(today);
    return {
      ...parsed,
      tasks: parsed.tasks.map((task) => {
        const legacyTask = task as LifeTask & { dueDate?: string; priority?: TaskPriority; progress?: number };
        return {
          ...task,
          dueDate: legacyTask.dueDate ?? task.date ?? "",
          priority: legacyTask.priority ?? "medium",
          progress: Math.min(100, Math.max(0, legacyTask.progress ?? (task.done ? 100 : 0))),
          projectId: task.projectId ?? "",
        };
      }),
      records: Array.isArray(parsed.records) ? parsed.records.map((record) => ({ ...record, linkedTripId: record.linkedTripId ?? "", mood: record.mood ?? "", location: record.location ?? "", tags: Array.isArray(record.tags) ? record.tags : [] })) : seed(today).records,
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      trips: Array.isArray(parsed.trips) ? parsed.trips.map((trip) => ({ ...trip, packingItemIds: Array.isArray(trip.packingItemIds) ? trip.packingItemIds : [] })) : [],
      itineraries: Array.isArray(parsed.itineraries) ? parsed.itineraries : [],
      outfitTemplates: Array.isArray(parsed.outfitTemplates) ? parsed.outfitTemplates.map((template) => ({ ...template, itemIds: Array.isArray(template.itemIds) ? [...new Set(template.itemIds)] : [] })) : [],
      outfitLogs: Array.isArray(parsed.outfitLogs) ? parsed.outfitLogs.map((log) => ({ ...log, templateId: log.templateId ?? "", itemIds: Array.isArray(log.itemIds) ? [...new Set(log.itemIds)] : [] })) : [],
    };
  } catch {
    return seed(today);
  }
}

function createId(prefix: string) {
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${value}`;
}

export function createLifeSystemStore(storage?: Storage, today = getTodayIso()) {
  let snapshot = load(storage, today);
  const listeners = new Set<() => void>();
  const publish = (next: LifeSystemSnapshot) => {
    snapshot = next;
    storage?.setItem(LIFE_SYSTEM_STORAGE_KEY, JSON.stringify(next));
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    replaceSnapshot(next: LifeSystemSnapshot) {
      publish(next);
    },
    toggleTask(id: string) {
      publish({ ...snapshot, tasks: snapshot.tasks.map((task) => task.id === id ? { ...task, done: !task.done, progress: task.done ? Math.min(task.progress, 95) : 100 } : task) });
    },
    addTask(input: { title: string; module: LifeModule; date: string; dueDate?: string; priority?: TaskPriority; progress?: number; time?: string; important?: boolean; projectId?: string }) {
      const title = input.title.trim();
      if (!title) throw new Error("记录内容不能为空");
      const task: LifeTask = {
        id: createId("task"), title, module: input.module, date: input.date, dueDate: input.dueDate ?? input.date, priority: input.priority ?? "medium", progress: Math.min(100, Math.max(0, input.progress ?? 0)), time: input.time ?? "", location: "",
        important: input.important ?? false, done: false, projectId: input.projectId ?? "",
      };
      publish({ ...snapshot, tasks: [...snapshot.tasks, task] });
      return task;
    },
    updateTaskProgress(id: string, progress: number) {
      const normalized = Math.min(100, Math.max(0, Math.round(progress)));
      publish({ ...snapshot, tasks: snapshot.tasks.map((task) => task.id === id ? { ...task, progress: normalized, done: normalized === 100 } : task) });
    },
    assignTaskToProject(id: string, projectId: string) {
      const normalizedProjectId = snapshot.projects.some((project) => project.id === projectId) ? projectId : "";
      publish({ ...snapshot, tasks: snapshot.tasks.map((task) => task.id === id ? { ...task, projectId: normalizedProjectId } : task) });
    },
    addProject(input: Pick<WorkProject, "name" | "startDate" | "endDate" | "goal"> & Partial<Pick<WorkProject, "notes" | "status">>) {
      const name = input.name.trim();
      if (!name) throw new Error("项目名称不能为空");
      const project: WorkProject = { id: createId("project"), name, status: input.status ?? "active", startDate: input.startDate, endDate: input.endDate, goal: input.goal.trim(), notes: input.notes?.trim() ?? "" };
      publish({ ...snapshot, projects: [...snapshot.projects, project] });
      return project;
    },
    updateProject(id: string, input: Partial<Omit<WorkProject, "id">>) {
      if (input.name !== undefined && !input.name.trim()) throw new Error("项目名称不能为空");
      publish({ ...snapshot, projects: snapshot.projects.map((project) => project.id === id ? { ...project, ...input, name: input.name?.trim() ?? project.name, goal: input.goal?.trim() ?? project.goal, notes: input.notes?.trim() ?? project.notes } : project) });
    },
    deleteProject(id: string) {
      publish({
        ...snapshot,
        projects: snapshot.projects.filter((project) => project.id !== id),
        tasks: snapshot.tasks.map((task) => task.projectId === id ? { ...task, projectId: "" } : task),
        skills: snapshot.skills.map((skill) => skill.linkedProjectId === id ? { ...skill, linkedProjectId: "" } : skill),
      });
    },
    getProjectProgress(id: string) {
      const linkedTasks = snapshot.tasks.filter((task) => task.projectId === id);
      if (linkedTasks.length === 0) return 0;
      return Math.round(linkedTasks.reduce((sum, task) => sum + task.progress, 0) / linkedTasks.length);
    },
    addSkill(input: Omit<WorkSkill, "id">) {
      const name = input.name.trim();
      if (!name) throw new Error("技能名称不能为空");
      const skill: WorkSkill = { ...input, id: createId("skill"), name, category: input.category.trim(), currentLevel: Math.min(5, Math.max(1, Math.round(input.currentLevel))), targetLevel: Math.min(5, Math.max(1, Math.round(input.targetLevel))), nextAction: input.nextAction.trim() };
      publish({ ...snapshot, skills: [...snapshot.skills, skill] });
      return skill;
    },
    updateSkill(id: string, input: Partial<Omit<WorkSkill, "id">>) {
      if (input.name !== undefined && !input.name.trim()) throw new Error("技能名称不能为空");
      publish({ ...snapshot, skills: snapshot.skills.map((skill) => skill.id === id ? { ...skill, ...input, name: input.name?.trim() ?? skill.name, category: input.category?.trim() ?? skill.category, currentLevel: input.currentLevel === undefined ? skill.currentLevel : Math.min(5, Math.max(1, Math.round(input.currentLevel))), targetLevel: input.targetLevel === undefined ? skill.targetLevel : Math.min(5, Math.max(1, Math.round(input.targetLevel))), nextAction: input.nextAction?.trim() ?? skill.nextAction } : skill) });
    },
    deleteSkill(id: string) {
      publish({ ...snapshot, skills: snapshot.skills.filter((skill) => skill.id !== id) });
    },
    addEvent(input: Omit<LifeEvent, "id">) {
      const event: LifeEvent = { ...input, title: input.title.trim(), id: createId("event") };
      if (!event.title) throw new Error("日程内容不能为空");
      publish({ ...snapshot, events: [...snapshot.events, event] });
      return event;
    },
    addRecord(input: {
      title: string;
      module: LifeModule;
      date: string;
      time?: string;
      durationMinutes?: number | null;
      content?: string;
      linkedTaskId?: string;
      linkedEventId?: string;
      linkedTripId?: string;
      mood?: string;
      location?: string;
      tags?: string[];
    }) {
      const title = input.title.trim();
      if (!title) throw new Error("记录内容不能为空");
      const record: DailyRecord = {
        id: createId("record"),
        title,
        module: input.module,
        date: input.date,
        time: input.time ?? "",
        durationMinutes: input.durationMinutes ?? null,
        content: input.content?.trim() ?? "",
        linkedTaskId: input.linkedTaskId ?? "",
        linkedEventId: input.linkedEventId ?? "",
        linkedTripId: input.linkedTripId ?? "",
        mood: input.mood?.trim() ?? "",
        location: input.location?.trim() ?? "",
        tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
        createdAt: new Date().toISOString(),
      };
      publish({ ...snapshot, records: [...snapshot.records, record] });
      return record;
    },
    updateRecord(id: string, input: Partial<Pick<DailyRecord, "title" | "date" | "time" | "durationMinutes" | "content" | "linkedTripId" | "mood" | "location" | "tags">>) {
      if (input.title !== undefined && !input.title.trim()) throw new Error("日记标题不能为空");
      publish({ ...snapshot, records: snapshot.records.map((record) => record.id === id ? { ...record, ...input, title: input.title?.trim() ?? record.title, content: input.content?.trim() ?? record.content, mood: input.mood?.trim() ?? record.mood, location: input.location?.trim() ?? record.location, tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? record.tags } : record) });
    },
    deleteRecord(id: string) {
      publish({ ...snapshot, records: snapshot.records.filter((record) => record.id !== id) });
    },
    addTrip(input: Omit<TravelTrip, "id" | "packingItemIds"> & { packingItemIds?: string[] }) {
      const title = input.title.trim();
      if (!title) throw new Error("旅行名称不能为空");
      const trip: TravelTrip = { ...input, id: createId("trip"), title, destination: input.destination.trim(), notes: input.notes.trim(), packingItemIds: input.packingItemIds ?? [] };
      publish({ ...snapshot, trips: [...snapshot.trips, trip] });
      return trip;
    },
    updateTrip(id: string, input: Partial<Omit<TravelTrip, "id">>) {
      if (input.title !== undefined && !input.title.trim()) throw new Error("旅行名称不能为空");
      publish({ ...snapshot, trips: snapshot.trips.map((trip) => trip.id === id ? { ...trip, ...input, title: input.title?.trim() ?? trip.title, destination: input.destination?.trim() ?? trip.destination, notes: input.notes?.trim() ?? trip.notes } : trip) });
    },
    deleteTrip(id: string) {
      publish({ ...snapshot, trips: snapshot.trips.filter((trip) => trip.id !== id), itineraries: snapshot.itineraries.filter((entry) => entry.tripId !== id), records: snapshot.records.map((record) => record.linkedTripId === id ? { ...record, linkedTripId: "" } : record) });
    },
    toggleTripPackingItem(id: string, itemId: string) {
      publish({ ...snapshot, trips: snapshot.trips.map((trip) => trip.id === id ? { ...trip, packingItemIds: trip.packingItemIds.includes(itemId) ? trip.packingItemIds.filter((entry) => entry !== itemId) : [...trip.packingItemIds, itemId] } : trip) });
    },
    addItinerary(input: Omit<TravelItineraryEntry, "id">) {
      const title = input.title.trim();
      if (!title) throw new Error("行程内容不能为空");
      if (!snapshot.trips.some((trip) => trip.id === input.tripId)) throw new Error("找不到对应旅行");
      const itinerary: TravelItineraryEntry = { ...input, id: createId("itinerary"), title, location: input.location.trim(), notes: input.notes.trim() };
      publish({ ...snapshot, itineraries: [...snapshot.itineraries, itinerary] });
      return itinerary;
    },
    updateItinerary(id: string, input: Partial<Omit<TravelItineraryEntry, "id" | "tripId">>) {
      if (input.title !== undefined && !input.title.trim()) throw new Error("行程内容不能为空");
      publish({ ...snapshot, itineraries: snapshot.itineraries.map((entry) => entry.id === id ? { ...entry, ...input, title: input.title?.trim() ?? entry.title, location: input.location?.trim() ?? entry.location, notes: input.notes?.trim() ?? entry.notes } : entry) });
    },
    deleteItinerary(id: string) {
      publish({ ...snapshot, itineraries: snapshot.itineraries.filter((entry) => entry.id !== id) });
    },
    addOutfitTemplate(input: Omit<OutfitTemplate, "id" | "createdAt">) {
      const name = input.name.trim();
      const itemIds = [...new Set(input.itemIds)];
      if (!name) throw new Error("搭配名称不能为空");
      if (itemIds.length === 0) throw new Error("请至少选择一件衣服");
      const template: OutfitTemplate = { ...input, id: createId("outfit-template"), name, itemIds, season: input.season.trim(), occasion: input.occasion.trim(), notes: input.notes.trim(), createdAt: new Date().toISOString() };
      publish({ ...snapshot, outfitTemplates: [...snapshot.outfitTemplates, template] });
      return template;
    },
    updateOutfitTemplate(id: string, input: Partial<Omit<OutfitTemplate, "id" | "createdAt">>) {
      const current = snapshot.outfitTemplates.find((template) => template.id === id);
      if (!current) throw new Error("找不到对应搭配");
      if (input.name !== undefined && !input.name.trim()) throw new Error("搭配名称不能为空");
      if (input.itemIds !== undefined && input.itemIds.length === 0) throw new Error("请至少选择一件衣服");
      const next: OutfitTemplate = { ...current, ...input, name: input.name?.trim() ?? current.name, itemIds: input.itemIds ? [...new Set(input.itemIds)] : current.itemIds, season: input.season?.trim() ?? current.season, occasion: input.occasion?.trim() ?? current.occasion, notes: input.notes?.trim() ?? current.notes };
      publish({ ...snapshot, outfitTemplates: snapshot.outfitTemplates.map((template) => template.id === id ? next : template) });
      return next;
    },
    deleteOutfitTemplate(id: string) {
      publish({ ...snapshot, outfitTemplates: snapshot.outfitTemplates.filter((template) => template.id !== id), outfitLogs: snapshot.outfitLogs.map((log) => log.templateId === id ? { ...log, templateId: "" } : log) });
    },
    addOutfitLog(input: Omit<OutfitLog, "id" | "createdAt">) {
      const itemIds = [...new Set(input.itemIds)];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("日期格式不正确");
      if (itemIds.length === 0) throw new Error("请至少选择一件衣服");
      const log: OutfitLog = { ...input, id: createId("outfit-log"), itemIds, occasion: input.occasion.trim(), weather: input.weather.trim(), notes: input.notes.trim(), createdAt: new Date().toISOString() };
      publish({ ...snapshot, outfitLogs: [...snapshot.outfitLogs, log] });
      return log;
    },
    updateOutfitLog(id: string, input: Partial<Omit<OutfitLog, "id" | "createdAt">>) {
      const current = snapshot.outfitLogs.find((log) => log.id === id);
      if (!current) throw new Error("找不到对应穿搭记录");
      if (input.itemIds !== undefined && input.itemIds.length === 0) throw new Error("请至少选择一件衣服");
      const next: OutfitLog = { ...current, ...input, itemIds: input.itemIds ? [...new Set(input.itemIds)] : current.itemIds, occasion: input.occasion?.trim() ?? current.occasion, weather: input.weather?.trim() ?? current.weather, notes: input.notes?.trim() ?? current.notes };
      publish({ ...snapshot, outfitLogs: snapshot.outfitLogs.map((log) => log.id === id ? next : log) });
      return next;
    },
    deleteOutfitLog(id: string) {
      publish({ ...snapshot, outfitLogs: snapshot.outfitLogs.filter((log) => log.id !== id) });
    },
    completeTaskWithRecord(id: string, input: { content?: string; durationMinutes?: number | null; date?: string; time?: string }) {
      const task = snapshot.tasks.find((entry) => entry.id === id);
      if (!task) throw new Error("找不到对应任务");
      const record: DailyRecord = {
        id: createId("record"), title: task.title, module: task.module, date: input.date ?? getTodayIso(), time: input.time ?? "",
        durationMinutes: input.durationMinutes ?? null, content: input.content?.trim() ?? "", linkedTaskId: task.id, linkedEventId: "", linkedTripId: "", mood: "", location: "", tags: [], createdAt: new Date().toISOString(),
      };
      publish({
        ...snapshot,
        tasks: snapshot.tasks.map((entry) => entry.id === id ? { ...entry, done: true, progress: 100 } : entry),
        records: [...snapshot.records, record],
      });
      return record;
    },
    addReview(input: Omit<ReviewEntry, "id" | "createdAt">) {
      const review: ReviewEntry = { ...input, id: createId("review"), createdAt: new Date().toISOString() };
      publish({ ...snapshot, reviews: [...snapshot.reviews, review] });
      return review;
    },
  };
}

export type LifeSystemStore = ReturnType<typeof createLifeSystemStore>;
const browserStorage = typeof window === "undefined" ? undefined : window.localStorage;
export const lifeSystemStore = createLifeSystemStore(browserStorage);
