
-- 1. Create kitchens table
CREATE TABLE public.kitchens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kitchens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kitchens" ON public.kitchens
  FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Admins can manage kitchens" ON public.kitchens
  FOR ALL TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND is_admin(auth.uid()));

-- 2. Create kitchen_product_assignments table
CREATE TABLE public.kitchen_product_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES public.kitchens(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  UNIQUE(kitchen_id, product_id)
);

ALTER TABLE public.kitchen_product_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kitchen product assignments" ON public.kitchen_product_assignments
  FOR SELECT TO authenticated
  USING (kitchen_id IN (SELECT id FROM public.kitchens WHERE business_id = get_user_business_id(auth.uid())));

CREATE POLICY "Admins can manage kitchen product assignments" ON public.kitchen_product_assignments
  FOR ALL TO authenticated
  USING (kitchen_id IN (SELECT id FROM public.kitchens WHERE business_id = get_user_business_id(auth.uid()) AND is_admin(auth.uid())));

-- 3. Create kitchen_user_assignments table
CREATE TABLE public.kitchen_user_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES public.kitchens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  UNIQUE(kitchen_id, user_id)
);

ALTER TABLE public.kitchen_user_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kitchen user assignments" ON public.kitchen_user_assignments
  FOR SELECT TO authenticated
  USING (kitchen_id IN (SELECT id FROM public.kitchens WHERE business_id = get_user_business_id(auth.uid())));

CREATE POLICY "Admins can manage kitchen user assignments" ON public.kitchen_user_assignments
  FOR ALL TO authenticated
  USING (kitchen_id IN (SELECT id FROM public.kitchens WHERE business_id = get_user_business_id(auth.uid()) AND is_admin(auth.uid())));

-- 4. Add kitchen_id to kot_tickets
ALTER TABLE public.kot_tickets ADD COLUMN kitchen_id uuid REFERENCES public.kitchens(id) ON DELETE SET NULL;

-- 5. Add updated_at trigger to kitchens
CREATE TRIGGER update_kitchens_updated_at
  BEFORE UPDATE ON public.kitchens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
