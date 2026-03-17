
-- Enums
CREATE TYPE public.room_type AS ENUM ('standard', 'deluxe', 'suite', 'premium');
CREATE TYPE public.room_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance', 'cleaning');
CREATE TYPE public.room_booking_status AS ENUM ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');
CREATE TYPE public.banquet_hall_status AS ENUM ('available', 'booked', 'maintenance');
CREATE TYPE public.banquet_booking_status AS ENUM ('confirmed', 'in_progress', 'completed', 'cancelled');

-- Rooms table
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  name text NOT NULL,
  room_number text NOT NULL,
  room_type public.room_type NOT NULL DEFAULT 'standard',
  floor integer DEFAULT 1,
  capacity integer DEFAULT 2,
  price_per_night numeric NOT NULL DEFAULT 0,
  amenities jsonb DEFAULT '[]'::jsonb,
  description text,
  image_url text,
  status public.room_status DEFAULT 'available',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rooms" ON public.rooms FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Admins/Managers can manage rooms" ON public.rooms FOR ALL USING (business_id = get_user_business_id(auth.uid()) AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'manager')));

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Room bookings table
CREATE TABLE public.room_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  room_id uuid NOT NULL REFERENCES public.rooms(id),
  customer_id uuid REFERENCES public.customers(id),
  booking_number text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  actual_check_in timestamptz,
  actual_check_out timestamptz,
  guest_count integer DEFAULT 1,
  total_amount numeric NOT NULL DEFAULT 0,
  advance_paid numeric DEFAULT 0,
  status public.room_booking_status DEFAULT 'confirmed',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view room bookings" ON public.room_bookings FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Staff can manage room bookings" ON public.room_bookings FOR ALL USING (business_id = get_user_business_id(auth.uid()));

CREATE TRIGGER update_room_bookings_updated_at BEFORE UPDATE ON public.room_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_bookings;

-- Banquet halls table
CREATE TABLE public.banquet_halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  name text NOT NULL,
  capacity integer DEFAULT 100,
  price_per_hour numeric DEFAULT 0,
  price_per_day numeric DEFAULT 0,
  amenities jsonb DEFAULT '[]'::jsonb,
  description text,
  image_url text,
  status public.banquet_hall_status DEFAULT 'available',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.banquet_halls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view banquet halls" ON public.banquet_halls FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Admins/Managers can manage banquet halls" ON public.banquet_halls FOR ALL USING (business_id = get_user_business_id(auth.uid()) AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'manager')));

CREATE TRIGGER update_banquet_halls_updated_at BEFORE UPDATE ON public.banquet_halls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Banquet bookings table
CREATE TABLE public.banquet_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  hall_id uuid NOT NULL REFERENCES public.banquet_halls(id),
  customer_id uuid REFERENCES public.customers(id),
  booking_number text NOT NULL,
  event_name text NOT NULL,
  event_type text,
  event_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  guest_count integer DEFAULT 50,
  total_amount numeric NOT NULL DEFAULT 0,
  advance_paid numeric DEFAULT 0,
  catering_included boolean DEFAULT false,
  special_requirements text,
  status public.banquet_booking_status DEFAULT 'confirmed',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.banquet_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view banquet bookings" ON public.banquet_bookings FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Staff can manage banquet bookings" ON public.banquet_bookings FOR ALL USING (business_id = get_user_business_id(auth.uid()));

CREATE TRIGGER update_banquet_bookings_updated_at BEFORE UPDATE ON public.banquet_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.banquet_bookings;

-- Seed permission modules for all roles
INSERT INTO public.permissions (role, module, can_view, can_create, can_edit, can_delete, can_export) VALUES
  ('admin', 'rooms', true, true, true, true, true),
  ('admin', 'rooms.bookings', true, true, true, true, true),
  ('admin', 'banquet', true, true, true, true, true),
  ('admin', 'banquet.bookings', true, true, true, true, true),
  ('manager', 'rooms', true, true, true, true, true),
  ('manager', 'rooms.bookings', true, true, true, true, true),
  ('manager', 'banquet', true, true, true, true, true),
  ('manager', 'banquet.bookings', true, true, true, true, true),
  ('cashier', 'rooms', true, false, false, false, false),
  ('cashier', 'rooms.bookings', true, true, true, false, false),
  ('cashier', 'banquet', true, false, false, false, false),
  ('cashier', 'banquet.bookings', true, true, true, false, false);
