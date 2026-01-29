import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Archive, Bell, CheckCheck, Mail, RotateCcw } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { useNotifications } from "./useNotifications";

type Props = {
  triggerClassName?: string;
};

const typeLabel: Record<string, string> = {
  low_stock: "Low stock",
  project_deadline: "Deadlines",
  maintenance: "Maintenance",
  system: "System",
};

function severityBadgeClass(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-destructive/20 text-destructive";
    case "warning":
      return "bg-primary/15 text-primary";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function NotificationCenter({ triggerClassName }: Props) {
  const [tab, setTab] = useState<"inbox" | "archived" | "rules">("inbox");
  const {
    loading,
    rulesLoading,
    unreadCount,
    activeItems,
    archivedItems,
    markRead,
    archive,
    unarchive,
    markAllRead,
    refresh,
    ruleEnabled,
    setRuleEnabled,
  } = useNotifications();

  const inboxItems = useMemo(() => activeItems, [activeItems]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "relative border-construction-steel text-construction-concrete hover:text-white hover:bg-construction-steel/20 active:scale-95",
            triggerClassName
          )}
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] leading-5 text-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-lg bg-construction-slate border-construction-steel/30">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            variant={tab === "inbox" ? "default" : "outline"}
            className={tab === "inbox" ? "bg-gradient-hero" : "border-construction-steel text-construction-concrete hover:bg-construction-steel/20 hover:text-white"}
            onClick={() => setTab("inbox")}
          >
            Inbox
          </Button>
          <Button
            type="button"
            variant={tab === "archived" ? "default" : "outline"}
            className={tab === "archived" ? "bg-gradient-hero" : "border-construction-steel text-construction-concrete hover:bg-construction-steel/20 hover:text-white"}
            onClick={() => setTab("archived")}
          >
            Archived
          </Button>
          <Button
            type="button"
            variant={tab === "rules" ? "default" : "outline"}
            className={tab === "rules" ? "bg-gradient-hero" : "border-construction-steel text-construction-concrete hover:bg-construction-steel/20 hover:text-white"}
            onClick={() => setTab("rules")}
          >
            Rules
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-construction-steel text-construction-concrete hover:bg-construction-steel/20 hover:text-white"
              onClick={refresh}
              title="Refresh"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            {tab === "inbox" && (
              <Button
                type="button"
                variant="outline"
                className="border-construction-steel text-construction-concrete hover:bg-construction-steel/20 hover:text-white"
                onClick={markAllRead}
                title="Mark all read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Separator className="my-4 bg-construction-steel/30" />

        {tab === "rules" ? (
          <div className="space-y-4">
            <Card className="bg-construction-dark/40 border-construction-steel/30 p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-foreground font-semibold leading-tight">Notification rules</p>
                  <p className="text-construction-concrete text-xs leading-tight">
                    Enable/disable types. (Defaults are ON.)
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {rulesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    {([
                      { type: "low_stock" as const, label: "Low stock" },
                      { type: "project_deadline" as const, label: "Project deadlines" },
                      { type: "maintenance" as const, label: "Maintenance reminders" },
                    ] as const).map((r) => (
                      <div key={r.type} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-foreground font-medium truncate">{r.label}</p>
                          <p className="text-construction-concrete text-xs truncate">Realtime + in-app alerts</p>
                        </div>
                        <Switch
                          checked={ruleEnabled(r.type)}
                          onCheckedChange={(v) => setRuleEnabled(r.type, Boolean(v))}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (tab === "archived" ? archivedItems : inboxItems).length === 0 ? (
              <Card className="bg-construction-dark/40 border-construction-steel/30 p-6">
                <p className="text-foreground font-semibold">Nothing here</p>
                <p className="text-construction-concrete text-sm mt-1">You’re all caught up.</p>
              </Card>
            ) : (
              (tab === "archived" ? archivedItems : inboxItems).map((n) => {
                const age = formatDistanceToNowStrict(new Date(n.created_at), { addSuffix: true });
                const isUnread = !n.read_at;
                const badge = typeLabel[n.type] ?? n.type;

                return (
                  <Card
                    key={n.id}
                    className={cn(
                      "bg-gradient-card border-construction-steel/30 p-4 transition-all",
                      isUnread ? "shadow-construction" : "opacity-95"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-xs px-2 py-1 rounded-full", severityBadgeClass(String(n.severity)))}>
                            {badge}
                          </span>
                          <span className="text-xs text-construction-concrete">{age}</span>
                          {isUnread && (
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary">Unread</span>
                          )}
                        </div>
                        <p className="text-foreground font-semibold mt-2 truncate">{n.title}</p>
                        {n.body && <p className="text-construction-concrete text-sm mt-1 line-clamp-2">{n.body}</p>}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {tab === "archived" ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="border-construction-steel text-construction-concrete hover:bg-construction-steel/20 hover:text-white"
                            onClick={() => unarchive(n.id)}
                            title="Restore"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="border-construction-steel text-construction-concrete hover:bg-construction-steel/20 hover:text-white"
                            onClick={() => archive(n.id)}
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          className="border-construction-steel text-construction-concrete hover:bg-construction-steel/20 hover:text-white"
                          onClick={() => markRead(n.id, Boolean(n.read_at) ? false : true)}
                          title={n.read_at ? "Mark unread" : "Mark read"}
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
