ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_type text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS va_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS snap_token text;