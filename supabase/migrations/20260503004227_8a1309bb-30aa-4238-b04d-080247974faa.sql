
-- Create enums
CREATE TYPE public.shipping_phase AS ENUM ('intercity', 'transition', 'lastmile', 'neardest', 'delivered');
CREATE TYPE public.icon_type AS ENUM ('truck', 'motor');

-- Shipment tracking table
CREATE TABLE public.shipment_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  resi_number TEXT NOT NULL,
  courier TEXT NOT NULL DEFAULT 'JNE',
  current_status TEXT NOT NULL DEFAULT 'Paket diterima di gudang',
  current_phase shipping_phase NOT NULL DEFAULT 'intercity',
  current_location TEXT,
  current_lat NUMERIC,
  current_lng NUMERIC,
  dest_lat NUMERIC,
  dest_lng NUMERIC,
  distance_to_dest_km NUMERIC DEFAULT 0,
  icon_type icon_type NOT NULL DEFAULT 'truck',
  checkpoints JSONB DEFAULT '[]'::jsonb,
  estimated_arrival DATE,
  origin_city TEXT DEFAULT 'Jakarta',
  dest_city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tracking checkpoints table
CREATE TABLE public.tracking_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  shipment_id UUID REFERENCES public.shipment_tracking(id) ON DELETE CASCADE NOT NULL,
  resi_number TEXT NOT NULL,
  checkpoint_name TEXT NOT NULL,
  location_name TEXT,
  lat NUMERIC,
  lng NUMERIC,
  phase shipping_phase NOT NULL DEFAULT 'intercity',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_checkpoints ENABLE ROW LEVEL SECURITY;

-- RLS policies for shipment_tracking
CREATE POLICY "Admins can manage all shipments" ON public.shipment_tracking FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own shipments" ON public.shipment_tracking FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = shipment_tracking.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "System can insert shipments" ON public.shipment_tracking FOR INSERT WITH CHECK (true);

-- RLS policies for tracking_checkpoints
CREATE POLICY "Admins can manage all checkpoints" ON public.tracking_checkpoints FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own checkpoints" ON public.tracking_checkpoints FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = tracking_checkpoints.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "System can insert checkpoints" ON public.tracking_checkpoints FOR INSERT WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_shipment_tracking_updated_at
  BEFORE UPDATE ON public.shipment_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_checkpoints;
