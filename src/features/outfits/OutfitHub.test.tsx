import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createLifeSystemStore } from "@/data/lifeSystemStore";
import { createPersonalStore } from "@/data/personalStore";
import { OutfitHub } from "./OutfitHub";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

afterEach(cleanup);

describe("outfit hub", () => {
  it("records today's clothing, syncs use count and ranks the item", () => {
    const lifeStore = createLifeSystemStore(new MemoryStorage(), "2026-08-16");
    const inventoryStore = createPersonalStore(new MemoryStorage());
    const clothing = inventoryStore.getSnapshot().items.find((item) => item.category === "衣服")!;
    const before = clothing.useCount;
    render(<OutfitHub lifeStore={lifeStore} inventoryStore={inventoryStore} today="2026-08-16" />);

    fireEvent.click(screen.getByRole("checkbox", { name: `选择${clothing.name}-${clothing.id}` }));
    fireEvent.click(screen.getByRole("button", { name: "保存今日穿搭" }));

    expect(lifeStore.getSnapshot().outfitLogs[0]).toMatchObject({ date: "2026-08-16", itemIds: [clothing.id] });
    expect(inventoryStore.getSnapshot().items.find((item) => item.id === clothing.id)?.useCount).toBe(before + 1);

    fireEvent.click(screen.getByRole("button", { name: "穿搭统计" }));
    expect(screen.getByRole("heading", { name: "穿着最多的单品" }).parentElement).toHaveTextContent(clothing.name);
  });

  it("creates a reusable fixed outfit", () => {
    const lifeStore = createLifeSystemStore(new MemoryStorage(), "2026-08-16");
    const inventoryStore = createPersonalStore(new MemoryStorage());
    const clothing = inventoryStore.getSnapshot().items.filter((item) => item.category === "衣服").slice(0, 2);
    render(<OutfitHub lifeStore={lifeStore} inventoryStore={inventoryStore} today="2026-08-16" />);

    fireEvent.click(screen.getByRole("button", { name: "固定搭配" }));
    fireEvent.click(screen.getByRole("button", { name: "新建固定搭配" }));
    fireEvent.change(screen.getByRole("textbox", { name: "搭配名称" }), { target: { value: "秋季通勤" } });
    clothing.forEach((item) => fireEvent.click(screen.getByRole("checkbox", { name: `搭配选择${item.name}-${item.id}` })));
    fireEvent.click(screen.getByRole("button", { name: "保存固定搭配" }));

    expect(lifeStore.getSnapshot().outfitTemplates[0]).toMatchObject({ name: "秋季通勤", itemIds: clothing.map((item) => item.id) });
    expect(screen.getByText("秋季通勤")).toBeInTheDocument();
  });

  it("reuses clothing photos in daily selection, templates, calendar and statistics", () => {
    const lifeStore = createLifeSystemStore(new MemoryStorage(), "2026-08-16");
    const inventoryStore = createPersonalStore(new MemoryStorage());
    const clothing = inventoryStore.getSnapshot().items.find((item) => item.category === "衣服")!;
    inventoryStore.updateItem(clothing.id, { imageUrl: "data:image/png;base64,cGhvdG8=" });
    const template = lifeStore.addOutfitTemplate({ name: "照片搭配", itemIds: [clothing.id], season: "夏", occasion: "通勤", notes: "" });
    lifeStore.addOutfitLog({ date: "2026-08-16", templateId: template.id, itemIds: [clothing.id], occasion: "通勤", weather: "晴", notes: "" });
    render(<OutfitHub lifeStore={lifeStore} inventoryStore={inventoryStore} today="2026-08-16" />);

    expect(screen.getByRole("img", { name: clothing.name })).toHaveAttribute("src", expect.stringContaining("data:image/png"));
    fireEvent.click(screen.getByRole("button", { name: "固定搭配" }));
    expect(screen.getByRole("img", { name: clothing.name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "穿搭日历" }));
    expect(screen.getByRole("img", { name: clothing.name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "穿搭统计" }));
    expect(screen.getAllByRole("img", { name: clothing.name }).length).toBeGreaterThanOrEqual(2);
  });
});
