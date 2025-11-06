-- Create table for password reset verification codes
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Add index for faster lookups
CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes(email);
CREATE INDEX idx_password_reset_codes_code ON public.password_reset_codes(code);

-- Clean up expired codes (trigger)
CREATE OR REPLACE FUNCTION clean_expired_reset_codes()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.password_reset_codes
  WHERE expires_at < now() OR used = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clean_expired_codes
  AFTER INSERT ON public.password_reset_codes
  EXECUTE FUNCTION clean_expired_reset_codes();