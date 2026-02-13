
-- 1. Add stock column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD CONSTRAINT products_stock_check CHECK (stock >= 0);

-- 2. Create new order status enum
CREATE TYPE public.order_status_new AS ENUM (
  'pending', 'paid', 'processing', 'packed', 'shipped', 'delivered', 'completed', 'return_requested', 'cancelled'
);

-- 3. Drop all policies that reference order_status
DROP POLICY IF EXISTS "Users can cancel their own pending/processing orders" ON public.orders;
DROP POLICY IF EXISTS "Users can request returns on completed orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update non-payment fields" ON public.orders;

-- 4. Migrate orders column to new enum
ALTER TABLE public.orders ALTER COLUMN order_status DROP DEFAULT;

ALTER TABLE public.orders 
  ALTER COLUMN order_status TYPE order_status_new 
  USING (
    CASE order_status::text
      WHEN 'pending_payment' THEN 'pending'::order_status_new
      WHEN 'in_transit' THEN 'shipped'::order_status_new
      ELSE order_status::text::order_status_new
    END
  );

ALTER TABLE public.orders ALTER COLUMN order_status SET DEFAULT 'pending'::order_status_new;

-- 5. Drop old enum and rename
DROP TYPE public.order_status;
ALTER TYPE public.order_status_new RENAME TO order_status;

-- 6. Recreate RLS policies with new enum values
CREATE POLICY "Users can cancel their own pending/processing orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id AND order_status IN ('pending', 'processing'))
  WITH CHECK (auth.uid() = user_id AND order_status IN ('pending', 'processing', 'cancelled'));

CREATE POLICY "Users can request returns on completed orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id AND order_status = 'completed')
  WITH CHECK (auth.uid() = user_id AND order_status IN ('completed', 'return_requested'));

CREATE POLICY "Users can update non-payment fields"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND payment_status = (SELECT o.payment_status FROM orders o WHERE o.id = orders.id)
    AND NOT (paid_at IS DISTINCT FROM (SELECT o.paid_at FROM orders o WHERE o.id = orders.id))
  );

CREATE POLICY "Users can confirm delivery"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id AND order_status = 'delivered')
  WITH CHECK (auth.uid() = user_id AND order_status = 'completed');

-- 7. Create order_items table
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price_at_purchase numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)));

CREATE POLICY "Admins can manage order items"
  ON public.order_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. Create checkout function
CREATE OR REPLACE FUNCTION public.checkout_order(
  p_user_id uuid,
  p_order_number text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_city text,
  p_postal_code text,
  p_payment_method text,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_stock integer;
  v_total numeric := 0;
  v_price numeric;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock INTO v_stock FROM products WHERE id = v_item->>'product_id' FOR UPDATE;
    IF v_stock IS NULL THEN RAISE EXCEPTION 'Product % not found', v_item->>'product_id'; END IF;
    IF v_stock < (v_item->>'quantity')::integer THEN
      RAISE EXCEPTION 'Stok tidak cukup untuk %: tersedia %, diminta %', v_item->>'product_name', v_stock, v_item->>'quantity';
    END IF;
    v_price := regexp_replace(v_item->>'product_price', '[^0-9]', '', 'g')::numeric;
    v_total := v_total + (v_price * (v_item->>'quantity')::integer);
  END LOOP;

  INSERT INTO orders (user_id, order_number, customer_name, customer_email, customer_phone, shipping_address, city, postal_code, payment_method, total_amount, product_id, product_name, product_price, product_image, size, quantity, order_status, payment_status)
  VALUES (p_user_id, p_order_number, p_customer_name, p_customer_email, p_customer_phone, p_shipping_address, p_city, p_postal_code, p_payment_method, v_total, (p_items->0->>'product_id'), (p_items->0->>'product_name'), (p_items->0->>'product_price'), (p_items->0->>'product_image'), (p_items->0->>'size'), (p_items->0->>'quantity')::integer, 'pending', 'pending')
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_price := regexp_replace(v_item->>'product_price', '[^0-9]', '', 'g')::numeric;
    INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (v_order_id, v_item->>'product_id', (v_item->>'quantity')::integer, v_price);
    UPDATE products SET stock = stock - (v_item->>'quantity')::integer WHERE id = v_item->>'product_id';
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- 9. Enable realtime for order_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
