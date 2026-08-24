import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPersonalStore } from "@/data/personalStore";
import { ItemDialogHost, openItemDialog } from "./ItemDialogHost";
import { PersonalInventoryPage } from "./PersonalInventoryPage";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("personal item library", () => {
  it("keeps the dashboard focused and opens its reusable item views", () => {
    const store = createPersonalStore(new MemoryStorage());
    const onViewChange = vi.fn();
    const onOpenSettings = vi.fn();
    render(<PersonalInventoryPage view="dashboard" store={store} embedded onViewChange={onViewChange} onOpenSettings={onOpenSettings} />);

    expect(screen.queryByRole("heading", { name: "即将过期" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "近期新增" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "导入 CSV" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "物品库" }));
    expect(onViewChange).toHaveBeenCalledWith("library");
    fireEvent.click(screen.getByRole("button", { name: "统计分析" }));
    expect(onViewChange).toHaveBeenCalledWith("stats");
    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(onViewChange).not.toHaveBeenCalledWith("settings");
  });

  it("uses a second-level title when embedded in the life page", () => {
    const store = createPersonalStore(new MemoryStorage());
    render(<PersonalInventoryPage view="dashboard" store={store} embedded />);

    expect(screen.getByRole("heading", { name: "我的物品手账", level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "我的物品手账", level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "每日使用" })).toBeInTheDocument();
  });

  it("filters seeded items and displays every attribute configured in settings", () => {
    const store = createPersonalStore(new MemoryStorage());
    store.addCategory({ id: "books", name: "图书", attributes: [] });
    store.addCategoryAttribute("clothes", { id: "clothing-size", name: "尺码", type: "text" });
    const clothing = store.getSnapshot().items.find((item) => item.id === "clothes01")!;
    store.updateItem(clothing.id, { customValues: { "clothing-size": "M" } });
    render(<PersonalInventoryPage view="library" store={store} />);

    expect(screen.getByRole("table").closest(".personal-library-table")).not.toBeNull();

    const categorySelect = screen.getByRole("combobox", { name: "类别" });
    expect(categorySelect).toHaveValue("");
    expect(within(categorySelect).getByRole("option", { name: "全部类别" })).toBeInTheDocument();
    expect(within(categorySelect).getByRole("option", { name: "图书" })).toBeInTheDocument();

    [
      "物品名称", "品牌", "型号", "颜色", "材质", "成分", "季节",
      "价格", "开始时间", "截止时间", "备注", "操作",
    ].forEach((name) => expect(screen.getByRole("columnheader", { name })).toBeInTheDocument());
    expect(screen.getByRole("columnheader", { name: "衣服 · 尺码" })).toBeInTheDocument();
    ["图片", "类别", "使用频率（天/次）", "单次使用成本", "使用时间(天)"].forEach((name) => {
      expect(screen.queryByRole("columnheader", { name })).not.toBeInTheDocument();
    });

    fireEvent.change(categorySelect, { target: { value: "衣服" } });
    expect(screen.getByRole("columnheader", { name: "尺码" })).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    fireEvent.change(categorySelect, { target: { value: "" } });

    fireEvent.change(screen.getByRole("textbox", { name: "名称" }), {
      target: { value: "键盘" },
    });
    expect(screen.getByText("键盘")).toBeInTheDocument();
    expect(screen.queryByText("黑色长裤")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "编辑键盘" })).toBeInTheDocument();

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "删除键盘" }));
    expect(screen.queryByText("键盘")).not.toBeInTheDocument();
    expect(confirm).toHaveBeenCalledOnce();
    confirm.mockRestore();
  });

  it("sizes table columns from their content and switches to two-column image tiles", () => {
    const store = createPersonalStore(new MemoryStorage());
    const clothing = store.getSnapshot().items.find((item) => item.id === "clothes01")!;
    store.updateItem(clothing.id, { imageUrl: "/media/clothing.jpg" });
    const { container } = render(<PersonalInventoryPage view="library" store={store} />);

    expect(screen.getByRole("button", { name: "表格" })).toHaveAttribute("aria-pressed", "true");
    const libraryTable = screen.getByRole("table").closest(".personal-library-table") as HTMLElement;
    expect(libraryTable.style.width).toMatch(/px$/);
    expect(libraryTable.style.minWidth).toBe("100%");
    const columnWidths = [...container.querySelectorAll<HTMLTableColElement>(".personal-library-table col")].map((column) => column.style.width);
    expect(new Set(columnWidths).size).toBeGreaterThan(2);

    fireEvent.click(screen.getByRole("button", { name: "大图磁贴" }));
    expect(screen.getByRole("button", { name: "大图磁贴" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const tileList = screen.getByRole("list", { name: "物品大图磁贴" });
    expect(within(tileList).getAllByRole("listitem")).toHaveLength(store.getSnapshot().items.length);
    expect(within(tileList).getByRole("img", { name: clothing.name })).toHaveAttribute("src", "/media/clothing.jpg");
    expect(within(tileList).getByRole("button", { name: `编辑${clothing.name}` })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "表格" }));
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("opens mobile item actions after a long press", () => {
    vi.useFakeTimers();
    const store = createPersonalStore(new MemoryStorage());
    const item = store.getSnapshot().items.find((candidate) => candidate.id === "electronic03")!;
    render(<PersonalInventoryPage view="library" store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "大图磁贴" }));

    const tile = screen.getByRole("button", { name: `查看${item.name}详情` }).closest("[role='listitem']")!;
    fireEvent.pointerDown(tile, { pointerType: "touch", clientX: 20, clientY: 20 });
    act(() => vi.advanceTimersByTime(520));

    expect(screen.getByRole("heading", { name: `操作 · ${item.name}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `编辑物品${item.name}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `删除物品${item.name}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消物品操作" }));
    expect(screen.queryByRole("heading", { name: `操作 · ${item.name}` })).not.toBeInTheDocument();

    fireEvent.pointerDown(tile, { pointerType: "touch", clientX: 20, clientY: 20 });
    fireEvent.pointerMove(tile, { pointerType: "touch", clientX: 40, clientY: 20 });
    act(() => vi.advanceTimersByTime(520));
    expect(screen.queryByRole("heading", { name: `操作 · ${item.name}` })).not.toBeInTheDocument();
  });

  it("adds a configurable base attribute from settings", () => {
    const store = createPersonalStore(new MemoryStorage());
    render(<PersonalInventoryPage view="settings" store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "新增属性" }));
    fireEvent.change(screen.getByRole("textbox", { name: "属性名称" }), { target: { value: "保修截止日" } });
    fireEvent.change(screen.getByRole("combobox", { name: "字段类型" }), { target: { value: "date" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByText("保修截止日")).toBeInTheDocument();
    expect(store.getSnapshot().baseAttributes.at(-1)).toMatchObject({ name: "保修截止日", type: "date" });
  });

  it("configures a single-select attribute and uses its options in the item form", () => {
    const store = createPersonalStore(new MemoryStorage());
    render(<PersonalInventoryPage view="settings" store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "新增属性" }));
    fireEvent.change(screen.getByRole("textbox", { name: "属性名称" }), { target: { value: "质检结果" } });
    fireEvent.change(screen.getByRole("combobox", { name: "字段类型" }), { target: { value: "select" } });
    expect(screen.getByRole("option", { name: "单选下拉框" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "选项值" }), { target: { value: "待检\n通过\n通过\n不通过" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    const attribute = store.getSnapshot().baseAttributes.at(-1)!;
    expect(attribute).toMatchObject({ name: "质检结果", type: "select", options: ["待检", "通过", "不通过"] });

    render(<ItemDialogHost store={store} />);
    act(() => openItemDialog());
    const itemSelect = screen.getByRole("combobox", { name: "质检结果" });
    expect(within(itemSelect).getAllByRole("option").map((option) => option.textContent)).toEqual(["请选择", "待检", "通过", "不通过"]);
    fireEvent.change(itemSelect, { target: { value: "通过" } });
    fireEvent.change(screen.getByRole("textbox", { name: "物品名称" }), { target: { value: "测试下拉物品" } });
    fireEvent.click(screen.getByRole("button", { name: "保存物品" }));

    expect(store.getSnapshot().items.at(-1)?.customValues?.[attribute.id]).toBe("通过");
  });

  it("adds clothing through the shared item dialog with a locked category", () => {
    const store = createPersonalStore(new MemoryStorage());
    render(<ItemDialogHost store={store} />);

    act(() => openItemDialog(undefined, { category: "衣服", lockCategory: true, title: "添加衣服" }));
    expect(screen.getByRole("heading", { name: "添加衣服" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "分类" })).toHaveValue("衣服");
    expect(screen.getByRole("combobox", { name: "分类" })).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: "物品名称" }), { target: { value: "米色风衣" } });
    fireEvent.click(screen.getByRole("button", { name: "保存物品" }));
    expect(store.getSnapshot().items.at(-1)).toMatchObject({ name: "米色风衣", category: "衣服" });
  });

  it("uploads and saves a clothing photo in the shared item dialog", async () => {
    const store = createPersonalStore(new MemoryStorage());
    render(<ItemDialogHost store={store} />);
    act(() => openItemDialog(undefined, { category: "衣服", lockCategory: true, title: "添加衣服" }));

    const file = new File(["image"], "coat.png", { type: "image/png" });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("img", { name: "物品预览" })).toBeInTheDocument());
    fireEvent.change(screen.getByRole("textbox", { name: "物品名称" }), { target: { value: "有照片的风衣" } });
    fireEvent.click(screen.getByRole("button", { name: "保存物品" }));

    expect(store.getSnapshot().items.at(-1)).toMatchObject({ name: "有照片的风衣", imageUrl: expect.stringContaining("data:image/png;base64") });
  });

  it("switches between settings tabs and omits local data controls", () => {
    const store = createPersonalStore(new MemoryStorage());
    const { container } = render(<PersonalInventoryPage view="settings" store={store} />);
    const page = within(container);

    expect(page.getByRole("tab", { name: "基础属性管理" })).toHaveAttribute("aria-selected", "true");
    expect(page.queryByRole("button", { name: "新增类别" })).not.toBeInTheDocument();
    expect(page.queryByText("本地数据")).not.toBeInTheDocument();

    fireEvent.click(page.getByRole("tab", { name: "类别管理" }));
    expect(page.getByRole("tab", { name: "类别管理" })).toHaveAttribute("aria-selected", "true");
    expect(page.getByRole("button", { name: "新增类别" })).toBeInTheDocument();
    expect(page.queryByRole("button", { name: "新增属性" })).not.toBeInTheDocument();
  });

  it("shows value-for-money metrics calculated from dates, usage and price", () => {
    const store = createPersonalStore(new MemoryStorage());
    const phone = store.getSnapshot().items.find((item) => item.price === 6300);
    const watch = store.getSnapshot().items.find((item) => item.price === 1980);
    expect(phone).toBeDefined();
    expect(watch).toBeDefined();
    store.updateItem(phone!.id, { endedAt: "2022-11-21", dailyUse: "是", useCount: 0 });
    store.updateItem(watch!.id, { useCount: 10 });

    const { container } = render(<PersonalInventoryPage view="stats" store={store} />);
    const page = within(container);

    expect(page.getByRole("heading", { name: "性价比" })).toBeInTheDocument();
    expect(page.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "名称", "价格", "单次使用成本", "购入日期", "弃用日期", "使用时间（天）",
      "使用次数", "使用频率（天/次）",
    ]);

    const phoneRow = page.getAllByRole("row").find((row) => within(row).queryByText("¥6,300"));
    expect(phoneRow).toBeDefined();
    expect(within(phoneRow!).getByText("2022-11-11")).toBeInTheDocument();
    expect(within(phoneRow!).getByText("2022-11-21")).toBeInTheDocument();
    expect(within(phoneRow!).getAllByText("10")).toHaveLength(2);
    expect(within(phoneRow!).getByText("1")).toBeInTheDocument();
    expect(within(phoneRow!).getByText("¥630")).toBeInTheDocument();

    fireEvent.click(page.getByRole("button", { name: "单次使用成本升序" }));
    let pricedRows = page.getAllByRole("row").filter((row) => within(row).queryByText("¥198") || within(row).queryByText("¥630"));
    expect(pricedRows[0]).toHaveTextContent("手表");
    expect(pricedRows[1]).toHaveTextContent("手机");
    expect(page.getByRole("button", { name: "单次使用成本升序" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(page.getByRole("button", { name: "单次使用成本降序" }));
    pricedRows = page.getAllByRole("row").filter((row) => within(row).queryByText("¥198") || within(row).queryByText("¥630"));
    expect(pricedRows[0]).toHaveTextContent("手机");
    expect(pricedRows[1]).toHaveTextContent("手表");
    expect(page.getByRole("button", { name: "单次使用成本降序" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows daily-use items in the dashboard value leaders", () => {
    const store = createPersonalStore(new MemoryStorage());
    const phone = store.getSnapshot().items.find((item) => item.price === 6300)!;
    const watch = store.getSnapshot().items.find((item) => item.price === 1980)!;
    store.updateItem(phone.id, { dailyUse: "是", useCount: 0, endedAt: "2022-11-21" });
    store.updateItem(watch.id, { dailyUse: "是", useCount: 0, endedAt: "2023-06-03" });

    const { container } = render(<PersonalInventoryPage view="dashboard" store={store} />);
    const page = within(container);
    const bestCard = page.getByRole("heading", { name: "性价比最高" }).parentElement!;
    const worstCard = page.getByRole("heading", { name: "性价比最低" }).parentElement!;

    expect(within(bestCard).getByRole("button", { name: /手机/ })).toHaveTextContent("单次成本 ¥630");
    expect(within(worstCard).getByRole("button", { name: /手表/ })).toHaveTextContent("单次成本 ¥990");
  });

  it("uses configured item attributes when calculating dashboard value leaders", () => {
    const store = createPersonalStore(new MemoryStorage());
    const builtInDailyUse = store.getSnapshot().baseAttributes.find((attribute) => attribute.itemKey === "dailyUse")!;
    store.removeBaseAttribute(builtInDailyUse.id);
    store.addBaseAttribute({
      id: "custom-daily-use",
      name: "是否每天使用",
      type: "select",
      options: ["是", "否"],
    });

    const phone = store.getSnapshot().items.find((item) => item.price === 6300)!;
    const watch = store.getSnapshot().items.find((item) => item.price === 1980)!;
    store.updateItem(phone.id, {
      dailyUse: "",
      useCount: 0,
      endedAt: "2022-11-21",
      customValues: { ...phone.customValues, "custom-daily-use": "是" },
    });
    store.updateItem(watch.id, {
      dailyUse: "",
      useCount: 0,
      endedAt: "2023-06-03",
      customValues: { ...watch.customValues, "custom-daily-use": "是" },
    });

    const { container } = render(<PersonalInventoryPage view="dashboard" store={store} />);
    const page = within(container);
    const bestCard = page.getByRole("heading", { name: "性价比最高" }).parentElement!;
    const worstCard = page.getByRole("heading", { name: "性价比最低" }).parentElement!;

    expect(within(bestCard).getByRole("button", { name: /手机/ })).toHaveTextContent("单次成本 ¥630");
    expect(within(worstCard).getByRole("button", { name: /手表/ })).toHaveTextContent("单次成本 ¥990");
  });

  it("records daily-used items and updates the statistics use count", () => {
    const store = createPersonalStore(new MemoryStorage());
    const phone = store.getSnapshot().items.find((item) => item.id === "electronic02")!;
    const before = phone.useCount;
    const { container, unmount } = render(<PersonalInventoryPage view="dashboard" store={store} />);
    const page = within(container);

    expect(page.getByRole("heading", { name: "每日花费" })).toBeInTheDocument();
    expect(page.getByRole("heading", { name: "每日使用" })).toBeInTheDocument();
    fireEvent.click(page.getByRole("checkbox", { name: `使用${phone.name}-${phone.id}` }));
    fireEvent.click(page.getByRole("button", { name: "保存每日使用" }));
    expect(page.getByRole("status")).toHaveTextContent("共 1 件物品");
    expect(store.getSnapshot().items.find((item) => item.id === phone.id)?.useCount).toBe(before + 1);

    unmount();
    const stats = render(<PersonalInventoryPage view="stats" store={store} />);
    const phoneRow = within(stats.container).getAllByRole("row").find((row) => within(row).queryAllByText("¥6,300").length > 0);
    expect(phoneRow).toBeDefined();
    expect(within(phoneRow!).getByText(String(before + 1))).toBeInTheDocument();
  });
});
