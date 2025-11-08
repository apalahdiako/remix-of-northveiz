-- Fix #1: Prevent users from updating payment_status (Payment Confirmation Bypass)
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;

-- Create restricted policy: users can update their orders but NOT payment fields
CREATE POLICY "Users can update non-payment fields"
ON orders FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND payment_status = (SELECT payment_status FROM orders WHERE id = orders.id)
  AND paid_at IS NOT DISTINCT FROM (SELECT paid_at FROM orders WHERE id = orders.id)
);

-- Allow admins to update payment status
CREATE POLICY "Admins can update all order fields including payment"
ON orders FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix #3: Remove "OR true" from visitor_sessions RLS policy
DROP POLICY IF EXISTS "Users can update their session" ON visitor_sessions;

-- Create secure policy for session updates
CREATE POLICY "Users can update only their own session"
ON visitor_sessions FOR UPDATE
USING (
  session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text)
);