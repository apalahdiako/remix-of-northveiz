
-- Add per-size stock columns and description/size_guide_url to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_s integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_m integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_l integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_xl integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_xxl integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS size_guide_url text,
  ADD COLUMN IF NOT EXISTS description text;

-- Create size_guides storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('size-guides', 'size-guides', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to size-guides bucket
CREATE POLICY "Anyone can view size guides"
ON storage.objects FOR SELECT
USING (bucket_id = 'size-guides');

-- Allow admins to upload size guides
CREATE POLICY "Admins can upload size guides"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'size-guides' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete size guides
CREATE POLICY "Admins can delete size guides"
ON storage.objects FOR DELETE
USING (bucket_id = 'size-guides' AND public.has_role(auth.uid(), 'admin'));
