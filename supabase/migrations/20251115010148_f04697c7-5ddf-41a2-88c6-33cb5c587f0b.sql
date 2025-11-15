-- Add is_pinned column to community_posts table
ALTER TABLE public.community_posts
ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

-- Add index for better performance when querying pinned posts
CREATE INDEX idx_community_posts_pinned ON public.community_posts(is_pinned, created_at DESC) WHERE is_visible = true;