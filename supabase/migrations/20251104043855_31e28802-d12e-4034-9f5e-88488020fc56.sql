-- Create products table
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  image TEXT NOT NULL,
  stock_status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_stock_status CHECK (stock_status IN ('available', 'out_of_stock', 'coming_soon'))
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view products
CREATE POLICY "Anyone can view products"
ON public.products
FOR SELECT
USING (true);

-- Only admins can manage products
CREATE POLICY "Only admins can insert products"
ON public.products
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update products"
ON public.products
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete products"
ON public.products
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- Insert initial products
INSERT INTO public.products (id, name, price, image, stock_status) VALUES
  ('hoodie', 'UVU SIGNATURE HOODIE', 'IDR 450.000', '/src/assets/product-hoodie.jpg', 'available'),
  ('jersey', 'UVU CORE JERSEY', 'IDR 350.000', '/src/assets/product-jersey.jpg', 'available'),
  ('denim', 'UVU DENIM JACKET', 'IDR 550.000', '/src/assets/product-denim.jpg', 'available'),
  ('hoodie-pecah', 'UVU PECAH HOODIE', 'IDR 475.000', '/src/assets/product-hoodie-pecah-front.webp', 'coming_soon'),
  ('ball', 'UVU BASKETBALL', 'IDR 250.000', '/src/assets/product-ball.jpg', 'coming_soon');