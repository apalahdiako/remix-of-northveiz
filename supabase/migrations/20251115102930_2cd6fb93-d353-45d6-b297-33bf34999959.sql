-- Add welcome email tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN last_welcome_sent timestamp with time zone;

-- Create contact logs table for individual emails
CREATE TABLE public.contact_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status_delivery text NOT NULL DEFAULT 'sent',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on contact_logs
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all contact logs
CREATE POLICY "Admins can view all contact logs"
ON public.contact_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert contact logs
CREATE POLICY "Admins can insert contact logs"
ON public.contact_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create email broadcasts table for mass emails
CREATE TABLE public.email_broadcasts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  content text NOT NULL,
  total_sent integer NOT NULL DEFAULT 0,
  total_delivered integer NOT NULL DEFAULT 0,
  total_failed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS on email_broadcasts
ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;

-- Admins can view all broadcasts
CREATE POLICY "Admins can view all broadcasts"
ON public.email_broadcasts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert broadcasts
CREATE POLICY "Admins can insert broadcasts"
ON public.email_broadcasts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update broadcasts
CREATE POLICY "Admins can update broadcasts"
ON public.email_broadcasts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add indexes for better performance
CREATE INDEX idx_contact_logs_user_id ON public.contact_logs(user_id);
CREATE INDEX idx_contact_logs_admin_id ON public.contact_logs(admin_id);
CREATE INDEX idx_email_broadcasts_admin_id ON public.email_broadcasts(admin_id);
CREATE INDEX idx_email_broadcasts_created_at ON public.email_broadcasts(created_at DESC);