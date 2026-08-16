import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { navigation } from "@/config/navigation";
import { SettingsPage } from "./SystemPages";

afterEach(cleanup);

describe("item settings ownership", () => {
  it("is not a global navigation item and returns to my items", () => {
    expect(navigation.some((item) => item.path === "/settings")).toBe(false);

    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/life/items" element={<h1>我的物品入口</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "返回我的物品" }));
    expect(screen.getByRole("heading", { name: "我的物品入口" })).toBeInTheDocument();
  });
});
