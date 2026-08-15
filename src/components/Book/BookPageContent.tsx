import type { ComponentType } from "react";
import { DashboardPage } from "@/pages/DashboardPage";
import { ExportPage } from "@/pages/ExportPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StatsPage } from "@/pages/StatsPage";
import { BookPageIndexProvider } from "@/contexts/BookPageContext";

/** 与 navigation / BOOK_PAGE_ROUTES 顺序一致 */
const PAGE_COMPONENTS: ComponentType[] = [
  DashboardPage,
  LibraryPage,
  StatsPage,
  ExportPage,
  SettingsPage,
];

/** 书页内容（外层 .book-scroll / max-w 由 BookPage 统一提供） */
export function BookPageContent({ index }: { index: number }) {
  const Component = PAGE_COMPONENTS[index];
  if (!Component) return null;

  return (
    <BookPageIndexProvider index={index}>
      <Component />
    </BookPageIndexProvider>
  );
}
