-- Add music metadata fields to community_posts table
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS music_artist text,
ADD COLUMN IF NOT EXISTS music_title text;