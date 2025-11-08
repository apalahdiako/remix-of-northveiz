import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Send, Instagram } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface CommunityPostDialogProps {
  post: {
    id: string;
    image_url: string;
    caption: string | null;
    created_at: string;
    user_id: string;
    instagram_username: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  likesCount: number;
  isLiked: boolean;
  onLikeToggle: () => void;
}

export function CommunityPostDialog({
  post,
  open,
  onOpenChange,
  likesCount,
  isLiked,
  onLikeToggle,
}: CommunityPostDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(true);

  useEffect(() => {
    if (post && open) {
      fetchComments();
      subscribeToComments();
    }
  }, [post, open]);

  const fetchComments = async () => {
    if (!post) return;

    const { data: commentsData, error } = await supabase
      .from("community_comments")
      .select("id, comment, created_at, user_id")
      .eq("post_id", post.id)
      .eq("is_visible", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }

    // Fetch profiles separately
    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const enrichedComments = commentsData.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || null
      }));

      setComments(enrichedComments);
    } else {
      setComments([]);
    }
  };

  const subscribeToComments = () => {
    if (!post) return;

    const channel = supabase
      .channel(`comments:${post.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_comments",
          filter: `post_id=eq.${post.id}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAddComment = async () => {
    if (!post || !user || !newComment.trim()) return;

    setLoading(true);
    const { error } = await supabase.from("community_comments").insert({
      post_id: post.id,
      user_id: user.id,
      comment: newComment.trim(),
    });

    if (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } else {
      setNewComment("");
      toast.success("Comment added");
    }
    setLoading(false);
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0 h-full max-h-[90vh]">
          {/* Image Section */}
          <div className="relative bg-background flex items-center justify-center max-h-[90vh] md:max-h-full overflow-hidden">
            <img
              src={post.image_url}
              alt={post.caption || "Community post"}
              className="w-full h-full object-cover md:object-contain"
            />
          </div>

          {/* Content Section */}
          <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            {/* Instagram Link */}
            <div className="p-4 border-b bg-muted/30">
              {post.instagram_username ? (
                <a
                  href={`https://instagram.com/${post.instagram_username.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                  <span>@{post.instagram_username.replace('@', '')}</span>
                </a>
              ) : (
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Instagram className="h-5 w-5" />
                  <span>Community Post</span>
                </div>
              )}
            </div>

            {/* Caption */}
            {post.caption && (
              <div className="p-4 border-b">
                <p className="text-sm">{post.caption}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 p-4 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLikeToggle}
                className="gap-2"
              >
                <Heart
                  className={`h-5 w-5 ${
                    isLiked ? "fill-red-500 text-red-500" : ""
                  }`}
                />
                <span>{likesCount}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                <span>{comments.length}</span>
              </Button>
            </div>

            {/* Comments Section */}
            {showComments && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t("community.noPostsYet")}
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {comment.profiles?.full_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-sm">
                              {comment.profiles?.full_name || "User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{comment.comment}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={t("community.addComment")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                      disabled={loading}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={loading || !newComment.trim()}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
