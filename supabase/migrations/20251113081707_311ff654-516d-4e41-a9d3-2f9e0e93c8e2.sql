-- Add parent_comment_id to support nested replies
ALTER TABLE public.community_comments
ADD COLUMN parent_comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE;

-- Create community_comment_likes table
CREATE TABLE public.community_comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on community_comment_likes
ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_comment_likes
CREATE POLICY "Authenticated users can view comment likes"
ON public.community_comment_likes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert their own comment likes"
ON public.community_comment_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own comment likes"
ON public.community_comment_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for comment likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comment_likes;