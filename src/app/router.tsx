import { Navigate, createBrowserRouter } from "react-router";
import { SystemShell } from "@/components/layout/SystemShell";
import { CalendarPage, LifePage, OutfitsPage, ReviewPage, SettingsPage, StudyPage, TodayPage, WorkPage } from "@/pages/SystemPages";
import { PersonalInventoryPage } from "@/features/personal/PersonalInventoryPage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <SystemShell />,
      children: [
        { index: true, element: <TodayPage /> },
        { path: "calendar", element: <CalendarPage /> },
        { path: "work", element: <WorkPage /> },
        { path: "life", element: <Navigate to="/life/items" replace /> },
        { path: "life/items", element: <LifePage section="items" /> },
        { path: "life/reminders", element: <LifePage section="reminders" /> },
        { path: "life/diary", element: <LifePage section="diary" /> },
        { path: "life/travel", element: <LifePage section="travel" /> },
        { path: "study", element: <StudyPage /> },
        { path: "outfits", element: <OutfitsPage /> },
        { path: "review", element: <ReviewPage /> },
        { path: "settings", element: <SettingsPage /> },
        { path: "life/items/library", element: <PersonalInventoryPage view="library" /> },
        { path: "life/items/stats", element: <PersonalInventoryPage view="stats" /> },
        { path: "life/items/export", element: <PersonalInventoryPage view="export" /> },
        { path: "life/items/settings", element: <PersonalInventoryPage view="settings" /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || undefined },
);
