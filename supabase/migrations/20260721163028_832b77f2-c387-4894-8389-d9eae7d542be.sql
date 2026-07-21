
-- Orders: restrict INSERT so user_id cannot be spoofed
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Users create own orders, guests create null-user orders"
ON public.orders FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.uid() IS NULL AND user_id IS NULL)
);

-- Orders: no longer expose guest orders to all authenticated users
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
