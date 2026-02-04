import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Clock, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [sessionUserId, setSessionUserId] = useState<string | null | undefined>(undefined);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSessionUserId(session?.user?.id ?? null);
      setSessionEmail(session?.user?.email ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSessionUserId(session?.user?.id ?? null);
      setSessionEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sessionUserId) {
        setIsAdmin(null);
        return;
      }
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: sessionUserId,
        _role: "admin",
      });
      if (cancelled) return;
      setIsAdmin(Boolean(!error && data));
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionUserId]);

  const dateTimeLabel = useMemo(() => {
    const date = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(now);

    const time = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);

    const [hh, mm] = time.split(":");
    return { date, time, hh: hh ?? "00", mm: mm ?? "00" };
  }, [now]);

  const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

  return (
    <header className="sticky top-0 z-40 px-2 pt-2">
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/85 px-4 py-3 shadow-[0_12px_40px_-32px_hsl(var(--foreground)/0.18)] backdrop-blur supports-[backdrop-filter]:bg-card/70">
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
            <div className="text-xs tabular-nums">
              <span key={minuteKey} className="inline-flex items-baseline gap-0.5 font-semibold text-foreground animate-in fade-in-0 duration-200">
                <span>{dateTimeLabel.hh}</span>
                <span className="mx-0.5 text-muted-foreground motion-safe:animate-pulse">:</span>
                <span>{dateTimeLabel.mm}</span>
              </span>
              <span className="text-muted-foreground"> • {dateTimeLabel.date}</span>
            </div>
          </div>

          {sessionEmail && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden lg:inline-flex bg-background/60"
                  title="Session status"
                >
                  <User className="h-4 w-4" />
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" />
                    {isAdmin ? "Admin" : "User"}
                  </span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="z-50 w-72 bg-popover">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background">
                    <User className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {isAdmin ? "Admin" : "User"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{sessionEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Role</span>
                  <span className="text-xs font-medium text-foreground">{isAdmin ? "admin" : "user"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className="text-xs font-medium text-foreground">Signed in</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="font-medium">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <NotificationCenter />

          {/* Logout is available in the Session status dropdown */}
        </div>
      </div>
    </header>
  );
}
