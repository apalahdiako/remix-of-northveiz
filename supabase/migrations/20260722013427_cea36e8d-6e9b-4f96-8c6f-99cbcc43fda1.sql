
ALTER TABLE public.visitor_sessions
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS isp text,
  ADD COLUMN IF NOT EXISTS asn text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS lookup_status text,
  ADD COLUMN IF NOT EXISTS lookup_error text,
  ADD COLUMN IF NOT EXISTS lookup_at timestamptz,
  ADD COLUMN IF NOT EXISTS raw_response jsonb;

ALTER TABLE public.visitor_sessions
  DROP CONSTRAINT IF EXISTS visitor_sessions_lat_range,
  DROP CONSTRAINT IF EXISTS visitor_sessions_lon_range;
ALTER TABLE public.visitor_sessions
  ADD CONSTRAINT visitor_sessions_lat_range CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
  ADD CONSTRAINT visitor_sessions_lon_range CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180));

-- Lock down direct writes; edge function uses service role
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Users can update only their own session" ON public.visitor_sessions;

-- Activity ping RPC (no location fields writable by clients)
CREATE OR REPLACE FUNCTION public.touch_visitor_session(p_sid text, p_path text, p_active boolean)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.visitor_sessions
     SET last_activity_at = now(),
         page_path = COALESCE(p_path, page_path),
         is_active = COALESCE(p_active, is_active)
   WHERE session_id = p_sid;
$$;

REVOKE ALL ON FUNCTION public.touch_visitor_session(text, text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.touch_visitor_session(text, text, boolean) TO anon, authenticated;
