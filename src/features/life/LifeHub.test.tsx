import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import { LifeHub } from "./LifeHub";

afterEach(cleanup);

describe("life hub", () => {
  function LocationProbe() {
    return <output aria-label="当前位置">{useLocation().pathname}</output>;
  }

  it("moves inventory expiration into reminders and reuses item subpages", () => {
    const { rerender } = render(<MemoryRouter initialEntries={["/life/items"]}><LifeHub section="items" calendar={<div>生活日历</div>} /><LocationProbe /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "我的物品手账" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "即将过期" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "生活板块" })).not.toBeInTheDocument();

    rerender(<MemoryRouter initialEntries={["/life/reminders"]}><LifeHub section="reminders" calendar={<div>生活日历</div>} /><LocationProbe /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "我的提醒" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "物品到期" })).toBeInTheDocument();

    rerender(<MemoryRouter initialEntries={["/life/items"]}><LifeHub section="items" calendar={<div>生活日历</div>} /><LocationProbe /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "统计分析" }));
    expect(screen.getByRole("heading", { name: "统计分析" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "性价比" })).toBeInTheDocument();
  });

  it("opens settings owned by the item shortcuts", () => {
    render(<MemoryRouter initialEntries={["/life/items"]}><LifeHub section="items" calendar={<div>生活日历</div>} /><LocationProbe /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    expect(screen.getByLabelText("当前位置")).toHaveTextContent("/settings");
  });
});
