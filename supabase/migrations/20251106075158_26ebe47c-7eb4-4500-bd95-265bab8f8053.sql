-- Fix security issues from previous migration

-- Fix: Add search_path to the function
DROP FUNCTION IF EXISTS clean_expired_reset_codes() CASCADE;

CREATE OR REPLACE FUNCTION clean_expired_reset_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_codes
  WHERE expires_at < now() OR used = true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_clean_expired_codes
  AFTER INSERT ON public.password_reset_codes
  EXECUTE FUNCTION clean_expired_reset_codes();

-- Note: No RLS policies needed for password_reset_codes table
-- This table should only be accessed via edge functions, not directly by users
-- RLS is enabled for protection but policies are intentionally not added