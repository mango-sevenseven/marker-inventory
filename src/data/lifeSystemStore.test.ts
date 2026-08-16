import { describe, expect, it } from "vitest";
import { createLifeSystemStore } from "./lifeSystemStore";

describe("lifeSystemStore", () => {
  it("切换任务完成状态并保持其他任务不变", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");
    const [first, second] = store.getSnapshot().tasks;

    store.toggleTask(first.id);

    expect(store.getSnapshot().tasks.find((task) => task.id === first.id)?.done).toBe(!first.done);
    expect(store.getSnapshot().tasks.find((task) => task.id === second.id)).toEqual(second);
  });

  it("快速记录会去除首尾空格并写入指定模块和日期", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");

    store.addTask({ title: "  整理旅行清单  ", module: "life", date: "2026-08-18", dueDate: "2026-08-22", priority: "high" });

    expect(store.getSnapshot().tasks.at(-1)).toMatchObject({
      title: "整理旅行清单",
      module: "life",
      date: "2026-08-18",
      dueDate: "2026-08-22",
      priority: "high",
      progress: 0,
      done: false,
    });
  });

  it("可以更新任务进度并限制在 0 到 100", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");
    const task = store.getSnapshot().tasks[0];

    store.updateTaskProgress(task.id, 65);
    expect(store.getSnapshot().tasks[0].progress).toBe(65);

    store.updateTaskProgress(task.id, 130);
    expect(store.getSnapshot().tasks[0].progress).toBe(100);
  });

  it("拒绝保存空白快速记录", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");
    expect(() => store.addTask({ title: "   ", module: "work", date: "2026-08-16" })).toThrow("记录内容不能为空");
  });

  it("保存实际记录并保留所属模块和实际用时", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");

    store.addRecord({
      title: "临时处理客户反馈",
      module: "work",
      date: "2026-08-16",
      time: "16:20",
      durationMinutes: 45,
      content: "确认问题并给出解决方案",
    });

    expect(store.getSnapshot().records.at(-1)).toMatchObject({
      title: "临时处理客户反馈",
      module: "work",
      time: "16:20",
      durationMinutes: 45,
    });
  });

  it("完成任务并记录时会关联计划和实际结果", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");
    const task = store.getSnapshot().tasks.find((entry) => !entry.done)!;

    store.completeTaskWithRecord(task.id, { content: "完成第一版", durationMinutes: 90 });

    expect(store.getSnapshot().tasks.find((entry) => entry.id === task.id)?.done).toBe(true);
    expect(store.getSnapshot().records.at(-1)).toMatchObject({
      linkedTaskId: task.id,
      title: task.title,
      content: "完成第一版",
      durationMinutes: 90,
    });
  });

  it("任务可以关联项目，项目进度按关联任务平均值计算", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");
    const project = store.addProject({ name: "个人管理系统", startDate: "2026-08-16", endDate: "2026-09-30", goal: "完成第一版" });
    const task = store.addTask({ title: "完成工作页", module: "work", date: "2026-08-16", projectId: project.id, progress: 50 });

    expect(task.projectId).toBe(project.id);
    expect(store.getProjectProgress(project.id)).toBe(50);

    store.updateTaskProgress(task.id, 100);
    expect(store.getProjectProgress(project.id)).toBe(100);
  });

  it("删除项目只解除任务关联，不会删除任务", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");
    const project = store.addProject({ name: "短期项目", startDate: "2026-08-16", endDate: "", goal: "" });
    const task = store.addTask({ title: "保留的任务", module: "work", date: "2026-08-16", projectId: project.id });

    store.deleteProject(project.id);

    expect(store.getSnapshot().projects.some((entry) => entry.id === project.id)).toBe(false);
    expect(store.getSnapshot().tasks.find((entry) => entry.id === task.id)?.projectId).toBe("");
  });

  it("项目支持编辑和归档，已有任务也能重新归属", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");
    const project = store.addProject({ name: "旧名称", startDate: "2026-08-16", endDate: "", goal: "" });
    const task = store.getSnapshot().tasks[0];

    store.updateProject(project.id, { name: "新名称", status: "archived" });
    store.assignTaskToProject(task.id, project.id);

    expect(store.getSnapshot().projects.find((entry) => entry.id === project.id)).toMatchObject({ name: "新名称", status: "archived" });
    expect(store.getSnapshot().tasks.find((entry) => entry.id === task.id)?.projectId).toBe(project.id);
  });

  it("可以新增并维护技能", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");
    const skill = store.addSkill({ name: "需求分析", category: "产品", currentLevel: 2, targetLevel: 4, nextAction: "完成一次需求复盘", linkedProjectId: "" });

    store.updateSkill(skill.id, { currentLevel: 3, nextAction: "沉淀需求模板" });

    expect(store.getSnapshot().skills.find((entry) => entry.id === skill.id)).toMatchObject({ currentLevel: 3, nextAction: "沉淀需求模板" });
  });

  it("生活记录可以作为日记补充心情、地点和标签并继续编辑", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");
    const diary = store.addRecord({ title: "海边散步", module: "life", date: "2026-08-16", content: "吹了很久的海风", mood: "轻松", location: "外滩", tags: ["散步", "周末"] });

    store.updateRecord(diary.id, { mood: "开心", content: "吹了很久的海风，也看到了晚霞" });

    expect(store.getSnapshot().records.find((entry) => entry.id === diary.id)).toMatchObject({ mood: "开心", location: "外滩", tags: ["散步", "周末"] });
  });

  it("旅行可以保存行程与行李物品", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");
    const trip = store.addTrip({ title: "杭州周末", destination: "杭州", startDate: "2026-09-05", endDate: "2026-09-06", status: "planning", budget: 1800, notes: "慢慢走" });
    const itinerary = store.addItinerary({ tripId: trip.id, date: "2026-09-05", time: "10:00", title: "西湖散步", location: "断桥", notes: "", done: false });

    store.toggleTripPackingItem(trip.id, "item-camera");
    store.updateItinerary(itinerary.id, { done: true });

    expect(store.getSnapshot().trips.find((entry) => entry.id === trip.id)?.packingItemIds).toEqual(["item-camera"]);
    expect(store.getSnapshot().itineraries.find((entry) => entry.id === itinerary.id)?.done).toBe(true);
  });

  it("删除旅行会删除其行程但保留并解除关联日记", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");
    const trip = store.addTrip({ title: "短途旅行", destination: "苏州", startDate: "2026-09-01", endDate: "2026-09-02", status: "planning", budget: null, notes: "" });
    store.addItinerary({ tripId: trip.id, date: "2026-09-01", time: "09:00", title: "出发", location: "", notes: "", done: false });
    const diary = store.addRecord({ title: "旅行第一天", module: "life", date: "2026-09-01", linkedTripId: trip.id });

    store.deleteTrip(trip.id);

    expect(store.getSnapshot().trips.some((entry) => entry.id === trip.id)).toBe(false);
    expect(store.getSnapshot().itineraries.some((entry) => entry.tripId === trip.id)).toBe(false);
    expect(store.getSnapshot().records.find((entry) => entry.id === diary.id)?.linkedTripId).toBe("");
  });

  it("可以维护固定搭配和每日穿搭记录", () => {
    const store = createLifeSystemStore(undefined, "2026-08-16");
    const template = store.addOutfitTemplate({ name: "秋季通勤", itemIds: ["coat", "pants"], season: "秋", occasion: "通勤", notes: "" });
    const log = store.addOutfitLog({ date: "2026-08-16", templateId: template.id, itemIds: ["coat", "pants"], occasion: "通勤", weather: "多云", notes: "" });

    store.updateOutfitTemplate(template.id, { name: "日常通勤" });
    store.updateOutfitLog(log.id, { itemIds: ["coat", "shoes"] });

    expect(store.getSnapshot().outfitTemplates[0]).toMatchObject({ name: "日常通勤", itemIds: ["coat", "pants"] });
    expect(store.getSnapshot().outfitLogs[0]).toMatchObject({ date: "2026-08-16", itemIds: ["coat", "shoes"] });

    store.deleteOutfitTemplate(template.id);
    expect(store.getSnapshot().outfitTemplates).toHaveLength(0);
    expect(store.getSnapshot().outfitLogs[0].templateId).toBe("");
  });
});
