-- Create visitor_sessions table for tracking visitors
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  user_id uuid,
  ip_address text,
  country_code text,
  country_name text,
  city text,
  latitude numeric,
  longitude numeric,
  user_agent text,
  page_path text,
  referrer text,
  is_active boolean DEFAULT true,
  last_activity_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for performance
CREATE INDEX idx_visitor_sessions_country ON public.visitor_sessions(country_code);
CREATE INDEX idx_visitor_sessions_active ON public.visitor_sessions(is_active);
CREATE INDEX idx_visitor_sessions_created ON public.visitor_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all sessions
CREATE POLICY "Admins can view all sessions"
  ON public.visitor_sessions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Policy for anyone to insert their session (for tracking)
CREATE POLICY "Anyone can create sessions"
  ON public.visitor_sessions
  FOR INSERT
  WITH CHECK (true);

-- Policy for updating own session
CREATE POLICY "Users can update their session"
  ON public.visitor_sessions
  FOR UPDATE
  USING (session_id = current_setting('request.headers')::json->>'x-session-id' OR true);

-- Add trigger for updated_at
CREATE TRIGGER update_visitor_sessions_updated_at
  BEFORE UPDATE ON public.visitor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add country and coordinates to orders if not exists (for mapping orders to locations)
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- Create index for orders by country
CREATE INDEX IF NOT EXISTS idx_orders_country ON public.orders(country_code);

-- Enable realtime for visitor_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_sessions;