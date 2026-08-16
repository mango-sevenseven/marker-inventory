import { BellRing, BookHeart, Box, BriefcaseBusiness, CalendarDays, GraduationCap, Home, Map, NotebookPen, Shirt, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LifeModule } from "@/types/lifeSystem";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  module?: LifeModule;
  children?: Array<{ path: string; label: string; icon: LucideIcon }>;
}

export const navigation: NavItem[] = [
  { path: "/", label: "今日", icon: Home, accent: "#d29a2f" },
  { path: "/calendar", label: "日历", icon: CalendarDays, accent: "#4f779f" },
  { path: "/work", label: "工作", icon: BriefcaseBusiness, accent: "#4f779f", module: "work" },
  { path: "/life", label: "生活", icon: Sprout, accent: "#648c55", module: "life", children: [
    { path: "/life/items", label: "我的物品", icon: Box },
    { path: "/life/reminders", label: "我的提醒", icon: BellRing },
    { path: "/life/diary", label: "我的日记", icon: BookHeart },
    { path: "/life/travel", label: "我的旅行", icon: Map },
  ] },
  { path: "/study", label: "学习", icon: GraduationCap, accent: "#c28a24", module: "study" },
  { path: "/outfits", label: "穿搭", icon: Shirt, accent: "#bd6678", module: "outfit" },
  { path: "/review", label: "回顾", icon: NotebookPen, accent: "#725791", module: "review" },
];
