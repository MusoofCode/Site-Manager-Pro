import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// System-wide activity events + per-user state
export type ActivityEvent = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_table: string;
  entity_id: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ActivityEventState = {
  id: string;
  user_id: string;
  event_id: string;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityItem = ActivityEvent & {
  read_at: string | null;
  archived_at: string | null;
};

export function useNotifications() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ActivityItem[]>([]);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const unreadCount = useMemo(() => items.filter((n) => !n.read_at && !n.archived_at).length, [items]);

  const activeItems = useMemo(() => items.filter((n) => !n.archived_at), [items]);
  const archivedItems = useMemo(() => items.filter((n) => Boolean(n.archived_at)), [items]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setItems([]);
        return;
      }

      // 1) Load latest global activity events (admin-only visibility via RLS)
      const { data: events, error: eventsError } = await supabase
        .from("activity_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (eventsError) throw eventsError;
      const eventRows = ((events as any[]) ?? []) as ActivityEvent[];
      const eventIds = eventRows.map((e) => e.id);

      // 2) Load per-user state for those events
      const { data: states, error: statesError } = await supabase
        .from("activity_event_states")
        .select("*")
        .eq("user_id", uid)
        .in("event_id", eventIds.length ? eventIds : ["00000000-0000-0000-0000-000000000000"]);
      if (statesError) throw statesError;

      const stateMap = new Map<string, ActivityEventState>();
      ((states as any[]) ?? []).forEach((s) => stateMap.set(String(s.event_id), s as any));

      const merged: ActivityItem[] = eventRows.map((e) => {
        const st = stateMap.get(e.id);
        return {
          ...e,
          read_at: st?.read_at ?? null,
          archived_at: st?.archived_at ?? null,
        };
      });

      setItems(merged);
    } catch (e: any) {
      toast({ title: "Notifications", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUserId(data.session?.user?.id ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;

    // Keep a single channel per user.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`activity:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_events",
        },
        (payload) => {
          const ev = payload.new as any as ActivityEvent;
          const item: ActivityItem = { ...ev, read_at: null, archived_at: null };
          setItems((prev) => [item, ...prev].slice(0, 200));

          // In-app alert
          toast({
            title: "Activity",
            description: ev.message,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_event_states",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const st = (payload.new ?? payload.old) as any as ActivityEventState;
          if (!st?.event_id) return;
          setItems((prev) =>
            prev.map((it) =>
              it.id === st.event_id
                ? { ...it, read_at: (payload.new as any)?.read_at ?? it.read_at, archived_at: (payload.new as any)?.archived_at ?? it.archived_at }
                : it
            )
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [toast, userId]);

  const upsertState = useCallback(
    async (eventId: string, patch: { read_at?: string | null; archived_at?: string | null }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id ?? null;
      if (!uid) throw new Error("Not authenticated");

      const payload = { user_id: uid, event_id: eventId, ...patch };
      const { data, error } = await supabase
        .from("activity_event_states")
        .upsert(payload as any, { onConflict: "user_id,event_id" })
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as any as ActivityEventState;
    },
    []
  );

  const markRead = useCallback(
    async (id: string, read: boolean) => {
    try {
      const payload = read ? { read_at: new Date().toISOString() } : { read_at: null };
      await upsertState(id, payload);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, ...payload } : n)));
    } catch (e: any) {
      toast({ title: "Notifications", description: e.message, variant: "destructive" });
    }
  },
  [toast, upsertState]
  );

  const archive = useCallback(async (id: string) => {
    try {
      const payload = { archived_at: new Date().toISOString() };
      await upsertState(id, payload);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, ...payload } : n)));
    } catch (e: any) {
      toast({ title: "Notifications", description: e.message, variant: "destructive" });
    }
  }, [toast, upsertState]);

  const unarchive = useCallback(async (id: string) => {
    try {
      const payload = { archived_at: null };
      await upsertState(id, payload);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, ...payload } : n)));
    } catch (e: any) {
      toast({ title: "Notifications", description: e.message, variant: "destructive" });
    }
  }, [toast, upsertState]);

  const markAllRead = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id ?? null;
      if (!uid) return;
      const now = new Date().toISOString();

      const unreadIds = items.filter((n) => !n.archived_at && !n.read_at).map((n) => n.id);
      if (!unreadIds.length) return;

      const rows = unreadIds.map((event_id) => ({ user_id: uid, event_id, read_at: now }));
      const { error } = await supabase
        .from("activity_event_states")
        .upsert(rows as any, { onConflict: "user_id,event_id" });
      if (error) throw error;

      setItems((prev) => prev.map((n) => (!n.archived_at && !n.read_at ? { ...n, read_at: now } : n)));
    } catch (e: any) {
      toast({ title: "Notifications", description: e.message, variant: "destructive" });
    }
  }, [items, toast]);

  return {
    userId,
    loading,
    unreadCount,
    items,
    activeItems,
    archivedItems,
    refresh,
    markRead,
    archive,
    unarchive,
    markAllRead,
  };
}
