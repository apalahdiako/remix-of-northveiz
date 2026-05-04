
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL DEFAULT 'NORTHVEIZ',
  store_address text NOT NULL DEFAULT 'Jakarta, Indonesia',
  store_phone text NOT NULL DEFAULT '+62 812-0000-0000',
  store_email text NOT NULL DEFAULT 'hello@northveiz.com',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view store settings"
ON public.store_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage store settings"
ON public.store_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.store_settings (store_name, store_address, store_phone, store_email)
VALUES ('NORTHVEIZ', 'Jakarta, Indonesia', '+62 812-0000-0000', 'hello@northveiz.com');
