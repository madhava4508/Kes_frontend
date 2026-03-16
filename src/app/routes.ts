import { createBrowserRouter } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { DashboardLayout } from "./pages/dashboard/DashboardLayout";
import { DashboardHome } from "./pages/dashboard/DashboardHome";
import { Vault } from "./pages/dashboard/Vault";
import { AIAssistant } from "./pages/dashboard/AIAssistant";
import { Search } from "./pages/dashboard/Search";
import { Settings } from "./pages/dashboard/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/dashboard",
    Component: DashboardLayout,
    children: [
      { index: true, Component: DashboardHome },
      { path: "vault", Component: Vault },
      { path: "ai-assistant", Component: AIAssistant },
      { path: "search", Component: Search },
      { path: "settings", Component: Settings },
    ],
  },
]);
