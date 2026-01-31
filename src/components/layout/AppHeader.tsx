import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { Clock, Moon, Sun } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { CommunicationDialog } from "@/components/communication/CommunicationDialog";

function routeLabel(pathname: string) {
  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/projects": "Projects",
    "/budget": "Budget & Costs",
    "/inventory": "Materials",
    "/equipment": "Equipment",
    "/workers": "Workers",
    "/attendance": "Attendance",
    "/payments": "Payments",
    "/maintenance": "Maintenance",
    "/documents": "Documents",
    "/reports": "Reports",
  };
  return map[pathname] ?? "Dashboard";
}

export function AppHeader({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const [now, setNow] = useState(() => new Date());
  const { theme, resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const themeMode = (theme ?? "system") as "dark" | "light" | "system";
  const effectiveTheme = (resolvedTheme ?? "dark") as "dark" | "light";
  const isDark = effectiveTheme === "dark";

  const dateTimeLabel = useMemo(() => {
    const date = now.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return { date, time };
  }, [now]);

  return (
    <header className="sticky top-0 z-40 px-2 pt-2">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card/70 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{routeLabel(location.pathname)}</p>
            <p className="truncate text-xs text-muted-foreground">SOMPROPERTY</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs">
              <span className="font-medium text-foreground">{dateTimeLabel.time}</span>
              <span className="text-muted-foreground"> • {dateTimeLabel.date}</span>
            </div>
          </div>

          <div className="hidden md:block">
            <Select value={themeMode} onValueChange={(v) => setTheme(v)}>
              <SelectTrigger className="w-[160px] bg-background/60">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CommunicationDialog />
          <NotificationCenter />

          <Button
            type="button"
            variant="outline"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button type="button" variant="default" onClick={onLogout} className="hidden sm:inline-flex">
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
