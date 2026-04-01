
-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert messages (guests too)
CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages FOR INSERT
TO public
WITH CHECK (true);

-- Anyone can read messages matching their session_id
CREATE POLICY "Anyone can read own session messages"
ON public.chat_messages FOR SELECT
TO public
USING (true);

-- Admins can read all messages
CREATE POLICY "Admins can read all chat messages"
ON public.chat_messages FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create chat-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true);

-- Storage policies for chat-images
CREATE POLICY "Anyone can upload chat images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'chat-images');

CREATE POLICY "Anyone can view chat images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-images');
