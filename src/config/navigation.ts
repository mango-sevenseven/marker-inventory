import { BarChart2, Boxes, Download, Home, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const navigation: NavItem[] = [
  { path: "/", label: "物品概览", icon: Home, end: true },
  { path: "/library", label: "物品库", icon: Boxes },
  { path: "/stats", label: "统计分析", icon: BarChart2 },
  { path: "/export", label: "导出备份", icon: Download },
  { path: "/settings", label: "设置", icon: Settings },
];
