-- System-wide activity feed (all actions) with per-user read/archive state

-- 1) Core events table (append-only)
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  action TEXT NOT NULL, -- 'INSERT'|'UPDATE'|'DELETE'|'SYSTEM'
  entity_table TEXT NOT NULL,
  entity_id UUID,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- Admins can read all events
DROP POLICY IF EXISTS "Admins can view activity events" ON public.activity_events;
CREATE POLICY "Admins can view activity events"
ON public.activity_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- No direct inserts/updates/deletes from client
DROP POLICY IF EXISTS "No direct insert activity events" ON public.activity_events;
CREATE POLICY "No direct insert activity events"
ON public.activity_events
FOR INSERT
WITH CHECK (false);

DROP POLICY IF EXISTS "No direct update activity events" ON public.activity_events;
CREATE POLICY "No direct update activity events"
ON public.activity_events
FOR UPDATE
USING (false);

DROP POLICY IF EXISTS "No direct delete activity events" ON public.activity_events;
CREATE POLICY "No direct delete activity events"
ON public.activity_events
FOR DELETE
USING (false);

CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON public.activity_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_entity ON public.activity_events (entity_table, entity_id);

-- 2) Per-user state for events (read/archive)
CREATE TABLE IF NOT EXISTS public.activity_event_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.activity_events(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

ALTER TABLE public.activity_event_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their activity event states" ON public.activity_event_states;
CREATE POLICY "Users can view their activity event states"
ON public.activity_event_states
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their activity event states" ON public.activity_event_states;
CREATE POLICY "Users can create their activity event states"
ON public.activity_event_states
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their activity event states" ON public.activity_event_states;
CREATE POLICY "Users can update their activity event states"
ON public.activity_event_states
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their activity event states" ON public.activity_event_states;
CREATE POLICY "Users can delete their activity event states"
ON public.activity_event_states
FOR DELETE
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_activity_event_states_updated_at ON public.activity_event_states;
CREATE TRIGGER update_activity_event_states_updated_at
BEFORE UPDATE ON public.activity_event_states
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_activity_event_states_user ON public.activity_event_states (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_event_states_event ON public.activity_event_states (event_id);

-- 3) Rolling window pruning + logging helper
-- Keeps the most recent N events overall (rolling window)
CREATE OR REPLACE FUNCTION public.log_activity_event(
  _actor_user_id UUID,
  _action TEXT,
  _entity_table TEXT,
  _entity_id UUID,
  _message TEXT,
  _metadata JSONB,
  _keep_last INTEGER DEFAULT 5000
)
RETURNS VOID AS $$
DECLARE
  _threshold_id UUID;
BEGIN
  INSERT INTO public.activity_events(actor_user_id, action, entity_table, entity_id, message, metadata)
  VALUES (_actor_user_id, _action, _entity_table, _entity_id, _message, COALESCE(_metadata, '{}'::jsonb));

  -- rolling window: delete anything older than the Nth newest event
  SELECT id INTO _threshold_id
  FROM public.activity_events
  ORDER BY created_at DESC
  OFFSET GREATEST(_keep_last - 1, 0)
  LIMIT 1;

  IF _threshold_id IS NOT NULL THEN
    DELETE FROM public.activity_events
    WHERE created_at < (SELECT created_at FROM public.activity_events WHERE id = _threshold_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4) Generic trigger function (message-only)
CREATE OR REPLACE FUNCTION public.trg_activity_log_generic()
RETURNS TRIGGER AS $$
DECLARE
  _actor UUID;
  _entity_id UUID;
  _msg TEXT;
  _action TEXT;
BEGIN
  -- Best-effort actor. If auth is not available, allow NULL.
  BEGIN
    _actor := auth.uid();
  EXCEPTION WHEN others THEN
    _actor := NULL;
  END;

  _action := TG_OP;
  _entity_id := COALESCE(NEW.id, OLD.id);

  IF TG_OP = 'INSERT' THEN
    _msg := TG_TABLE_NAME || ': created';
  ELSIF TG_OP = 'UPDATE' THEN
    _msg := TG_TABLE_NAME || ': updated';
  ELSIF TG_OP = 'DELETE' THEN
    _msg := TG_TABLE_NAME || ': deleted';
  ELSE
    _msg := TG_TABLE_NAME || ': changed';
  END IF;

  PERFORM public.log_activity_event(
    _actor,
    _action,
    TG_TABLE_NAME,
    _entity_id,
    _msg,
    '{}'::jsonb,
    5000
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5) Attach triggers to all core tables (INSERT/UPDATE/DELETE)
DO $$
BEGIN
  -- projects
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_projects') THEN
    CREATE TRIGGER trg_activity_projects
    AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_generic();
  END IF;

  -- expenses
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_expenses') THEN
    CREATE TRIGGER trg_activity_expenses
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_generic();
  END IF;

  -- materials
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_materials') THEN
    CREATE TRIGGER trg_activity_materials
    AFTER INSERT OR UPDATE OR DELETE ON public.materials
    FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_generic();
  END IF;

  -- material_transactions
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_material_transactions') THEN
    CREATE TRIGGER trg_activity_material_transactions
    AFTER INSERT OR UPDATE OR DELETE ON public.material_transactions
    FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_generic();
  END IF;

  -- equipment
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_equipment') THEN
    CREATE TRIGGER trg_activity_equipment
    AFTER INSERT OR UPDATE OR DELETE ON public.equipment
    FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_generic();
  END IF;

  -- workers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_workers') THEN
    CREATE TRIGGER trg_activity_workers
    AFTER INSERT OR UPDATE OR DELETE ON public.workers
    FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_generic();
  END IF;

  -- attendance
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_attendance') THEN
    CREATE TRIGGER trg_activity_attendance
    AFTER INSERT OR UPDATE OR DELETE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_generic();
  END IF;

  -- payments
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_payments') THEN
    CREATE TRIGGER trg_activity_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_generic();
  END IF;

  -- documents
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_documents') THEN
    CREATE TRIGGER trg_activity_documents
    AFTER INSERT OR UPDATE OR DELETE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_generic();
  END IF;

  -- maintenance_logs
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_maintenance_logs') THEN
    CREATE TRIGGER trg_activity_maintenance_logs
    AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_logs
    FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_generic();
  END IF;

  -- feedback_messages (communication)
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activity_feedback_messages') THEN
    CREATE TRIGGER trg_activity_feedback_messages
    AFTER INSERT OR UPDATE OR DELETE ON public.feedback_messages
    FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_generic();
  END IF;
END $$;

-- 6) Realtime: enable activity_events + activity_event_states
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_event_states;