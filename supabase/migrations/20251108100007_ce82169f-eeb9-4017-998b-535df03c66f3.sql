-- Add instagram_username field to community_posts table
ALTER TABLE public.community_posts 
ADD COLUMN instagram_username text;