CREATE TABLE public.admin_todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  label_text TEXT,
  label_color TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all todos" ON public.admin_todos FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert todos" ON public.admin_todos FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update todos" ON public.admin_todos FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete todos" ON public.admin_todos FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_admin_todos_updated_at
  BEFORE UPDATE ON public.admin_todos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_todos;