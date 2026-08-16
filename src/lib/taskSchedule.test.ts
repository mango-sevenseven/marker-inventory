import { describe, expect, it } from "vitest";
import { calculateRemainingDays } from "./taskSchedule";

describe("calculateRemainingDays", () => {
  it("计算截止日期相对今天的剩余天数", () => {
    expect(calculateRemainingDays("2026-08-20", "2026-08-16")).toBe(4);
    expect(calculateRemainingDays("2026-08-16", "2026-08-16")).toBe(0);
  });

  it("逾期返回负数，没有截止日期返回 null", () => {
    expect(calculateRemainingDays("2026-08-14", "2026-08-16")).toBe(-2);
    expect(calculateRemainingDays("", "2026-08-16")).toBeNull();
  });
});
