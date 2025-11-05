-- Add order status enum with all required statuses
CREATE TYPE order_status AS ENUM (
  'pending_payment',    -- Belum Bayar
  'processing',         -- Dikemas
  'in_transit',        -- Dikirim
  'completed',         -- Selesai
  'return_requested',  -- Pengembalian
  'cancelled'          -- Dibatalkan
);

-- Add new columns to orders table for order management
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS order_status order_status DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS return_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, order_status);

-- Update RLS policies to allow users to cancel their own orders
CREATE POLICY "Users can cancel their own pending/processing orders"
  ON orders
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND order_status IN ('pending_payment', 'processing')
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND order_status IN ('pending_payment', 'processing', 'cancelled')
  );

-- Allow users to request returns on completed orders
CREATE POLICY "Users can request returns on completed orders"
  ON orders
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND order_status = 'completed'
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND order_status IN ('completed', 'return_requested')
  );

-- Admin policies for order management
CREATE POLICY "Admins can view all orders"
  ON orders
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all orders"
  ON orders
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;