-- Materials stock movements history + safe stock updates

CREATE TABLE IF NOT EXISTS public.material_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  project_id UUID NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in','out')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC NULL,
  note TEXT NULL,
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.material_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage material transactions"
ON public.material_transactions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_material_transactions_material_id ON public.material_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_transactions_project_id ON public.material_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_material_transactions_occurred_at ON public.material_transactions(occurred_at);

-- Apply stock changes and prevent negative inventory
CREATE OR REPLACE FUNCTION public.apply_material_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_qty INTEGER;
  delta INTEGER;
BEGIN
  SELECT quantity INTO current_qty
  FROM public.materials
  WHERE id = NEW.material_id
  FOR UPDATE;

  IF current_qty IS NULL THEN
    RAISE EXCEPTION 'Material not found';
  END IF;

  IF NEW.transaction_type = 'in' THEN
    delta := NEW.quantity;
  ELSIF NEW.transaction_type = 'out' THEN
    delta := -NEW.quantity;
  ELSE
    RAISE EXCEPTION 'Invalid transaction_type';
  END IF;

  IF current_qty + delta < 0 THEN
    RAISE EXCEPTION 'Insufficient stock (current %, requested %)', current_qty, NEW.quantity;
  END IF;

  UPDATE public.materials
  SET quantity = current_qty + delta,
      updated_at = now()
  WHERE id = NEW.material_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_material_transaction ON public.material_transactions;

CREATE TRIGGER trg_apply_material_transaction
AFTER INSERT ON public.material_transactions
FOR EACH ROW
EXECUTE FUNCTION public.apply_material_transaction();
