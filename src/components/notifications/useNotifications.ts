import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type NotificationSeverity = "info" | "warning" | "critical";

export type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  severity: NotificationSeverity | string;
  entity_table: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
};

type NotificationRule = {
  id: string;
  user_id: string;
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const RULE_TYPES = ["low_stock", "project_deadline", "maintenance"] as const;

export function useNotifications() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rules, setRules] = useState<Record<string, NotificationRule>>({});

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read_at && !n.archived_at).length,
    [items]
  );

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

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setItems((data as any[]) as AppNotification[]);
    } catch (e: any) {
      toast({ title: "Notifications", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const refreshRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setRules({});
        return;
      }

      const { data, error } = await supabase
        .from("notification_rules")
        .select("*")
        .eq("user_id", uid);
      if (error) throw error;

      const map: Record<string, NotificationRule> = {};
      (data as any[])?.forEach((r) => {
        map[r.type] = r as NotificationRule;
      });
      setRules(map);
    } catch (e: any) {
      toast({ title: "Notification rules", description: e.message, variant: "destructive" });
    } finally {
      setRulesLoading(false);
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
    refreshRules();
  }, [refresh, refreshRules]);

  useEffect(() => {
    if (!userId) return;

    // Keep a single channel per user.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as any as AppNotification;
          setItems((prev) => [n, ...prev]);

          // In-app alert
          toast({
            title: n.title,
            description: n.body ?? undefined,
          });
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

  const markRead = useCallback(async (id: string, read: boolean) => {
    try {
      const payload = read ? { read_at: new Date().toISOString() } : { read_at: null };
      const { error } = await supabase.from("notifications").update(payload as any).eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, ...payload } : n)));
    } catch (e: any) {
      toast({ title: "Notifications", description: e.message, variant: "destructive" });
    }
  }, [toast]);

  const archive = useCallback(async (id: string) => {
    try {
      const payload = { archived_at: new Date().toISOString() };
      const { error } = await supabase.from("notifications").update(payload as any).eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, ...payload } : n)));
    } catch (e: any) {
      toast({ title: "Notifications", description: e.message, variant: "destructive" });
    }
  }, [toast]);

  const unarchive = useCallback(async (id: string) => {
    try {
      const payload = { archived_at: null };
      const { error } = await supabase.from("notifications").update(payload as any).eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, ...payload } : n)));
    } catch (e: any) {
      toast({ title: "Notifications", description: e.message, variant: "destructive" });
    }
  }, [toast]);

  const markAllRead = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id ?? null;
      if (!uid) return;
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: now } as any)
        .eq("user_id", uid)
        .is("archived_at", null)
        .is("read_at", null);
      if (error) throw error;
      setItems((prev) => prev.map((n) => (!n.archived_at && !n.read_at ? { ...n, read_at: now } : n)));
    } catch (e: any) {
      toast({ title: "Notifications", description: e.message, variant: "destructive" });
    }
  }, [toast]);

  const setRuleEnabled = useCallback(
    async (type: typeof RULE_TYPES[number], enabled: boolean) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user?.id ?? null;
        if (!uid) return;

        const payload = { user_id: uid, type, enabled, config: rules[type]?.config ?? {} };
        const { data, error } = await supabase
          .from("notification_rules")
          .upsert(payload as any, { onConflict: "user_id,type" })
          .select("*")
          .maybeSingle();
        if (error) throw error;

        if (data) setRules((prev) => ({ ...prev, [type]: data as any }));
      } catch (e: any) {
        toast({ title: "Notification rules", description: e.message, variant: "destructive" });
      }
    },
    [rules, toast]
  );

  const ruleEnabled = useCallback(
    (type: typeof RULE_TYPES[number]) => {
      // If no rule exists yet, default to enabled.
      return rules[type]?.enabled ?? true;
    },
    [rules]
  );

  return {
    userId,
    loading,
    rulesLoading,
    unreadCount,
    items,
    activeItems,
    archivedItems,
    refresh,
    refreshRules,
    markRead,
    archive,
    unarchive,
    markAllRead,
    ruleEnabled,
    setRuleEnabled,
  };
}
