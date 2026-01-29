import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Archive, Bell, CheckCheck, RotateCcw } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { useNotifications } from "./useNotifications";

type Props = {
  triggerClassName?: string;
};

function actionBadgeClass(action: string) {
  switch (action) {
    case "DELETE":
      return "bg-destructive/20 text-destructive";
    case "UPDATE":
      return "bg-primary/15 text-primary";
    case "INSERT":
      return "bg-muted text-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function NotificationCenter({ triggerClassName }: Props) {
  const [tab, setTab] = useState<"inbox" | "archived">("inbox");
  const {
    loading,
    unreadCount,
    activeItems,
    archivedItems,
    markRead,
    archive,
    unarchive,
    markAllRead,
    refresh,
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
                        <span className={cn("text-xs px-2 py-1 rounded-full", actionBadgeClass(String(n.action)))}>
                          {n.action}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          {n.entity_table}
                        </span>
                        <span className="text-xs text-construction-concrete">{age}</span>
                        {isUnread && (
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary">Unread</span>
                        )}
                      </div>
                      <p className="text-foreground font-semibold mt-2 truncate">{n.message}</p>
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
      </SheetContent>
    </Sheet>
  );
}
