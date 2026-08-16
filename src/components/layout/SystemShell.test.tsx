import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { SystemShell } from "./SystemShell";

afterEach(cleanup);

describe("system navigation", () => {
  it("renders life modules as sidebar subnavigation and keeps route state visible", () => {
    render(
      <MemoryRouter initialEntries={["/life/reminders"]}>
        <Routes>
          <Route element={<SystemShell />}>
            <Route path="life/reminders" element={<h1>提醒内容</h1>} />
            <Route path="life/diary" element={<h1>日记内容</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const subnav = screen.getByRole("group", { name: "生活子菜单" });
    expect(within(subnav).getAllByRole("link").map((link) => link.textContent)).toEqual(["我的物品", "我的提醒", "我的日记", "我的旅行"]);
    expect(screen.getByRole("link", { name: "生活" })).toHaveClass("active");
    expect(within(subnav).getByRole("link", { name: "我的提醒" })).toHaveClass("active");

    fireEvent.click(within(subnav).getByRole("link", { name: "我的日记" }));
    expect(screen.getByRole("heading", { name: "日记内容" })).toBeInTheDocument();
    expect(within(subnav).getByRole("link", { name: "我的日记" })).toHaveClass("active");
  });
});
