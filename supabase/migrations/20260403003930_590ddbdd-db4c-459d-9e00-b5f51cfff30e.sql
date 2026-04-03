
-- Add message_type and file_url columns to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
ADD COLUMN IF NOT EXISTS file_url text;

-- Create voice-notes storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for voice notes
CREATE POLICY "Anyone can read voice notes"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-notes');

-- Anyone can upload voice notes
CREATE POLICY "Anyone can upload voice notes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-notes');
