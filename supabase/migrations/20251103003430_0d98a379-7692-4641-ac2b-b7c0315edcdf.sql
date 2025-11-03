-- Create table for global timer settings
CREATE TABLE IF NOT EXISTS public.global_timer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Flash Sale Berakhir Dalam',
  timer_type TEXT NOT NULL DEFAULT 'countdown', -- 'countdown' or 'current_time'
  target_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  action_link TEXT DEFAULT '/catalog',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_timer ENABLE ROW LEVEL SECURITY;

-- Everyone can view the timer
CREATE POLICY "Anyone can view global timer"
ON public.global_timer
FOR SELECT
USING (true);

-- Only admins can insert/update/delete timer
CREATE POLICY "Only admins can manage global timer"
ON public.global_timer
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Insert default timer
INSERT INTO public.global_timer (title, timer_type, target_date, is_active, action_link)
VALUES (
  'Flash Sale Berakhir Dalam',
  'countdown',
  NOW() + INTERVAL '7 days',
  true,
  '/catalog'
);

-- Add trigger for updated_at
CREATE TRIGGER update_global_timer_updated_at
BEFORE UPDATE ON public.global_timer
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_timer;