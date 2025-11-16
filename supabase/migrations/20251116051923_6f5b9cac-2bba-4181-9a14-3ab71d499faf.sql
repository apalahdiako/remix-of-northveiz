-- Add emoji_reactions column to community_comments table
ALTER TABLE community_comments 
ADD COLUMN IF NOT EXISTS emoji_reactions JSONB DEFAULT '[]'::jsonb;

-- Add index for better performance on emoji queries
CREATE INDEX IF NOT EXISTS idx_community_comments_emoji_reactions 
ON community_comments USING gin(emoji_reactions);

-- Add comment for documentation
COMMENT ON COLUMN community_comments.emoji_reactions IS 'Stores emoji reactions as array of {emoji: string, user_id: uuid, created_at: timestamp}';
