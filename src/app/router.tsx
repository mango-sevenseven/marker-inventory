import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { ExportPage } from "@/pages/ExportPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StatsPage } from "@/pages/StatsPage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: "library", element: <LibraryPage /> },
        { path: "stats", element: <StatsPage /> },
        { path: "export", element: <ExportPage /> },
        { path: "settings", element: <SettingsPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || undefined },
);
