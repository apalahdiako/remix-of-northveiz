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
  parent_comment_id: string | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  likes_count?: number;
  is_liked?: boolean;
  replies?: Comment[];
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (post && open) {
      fetchComments();
      const unsubscribe = subscribeToComments();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [post, open]);

  const fetchComments = async () => {
    if (!post || !user) return;

    const { data: commentsData, error } = await supabase
      .from("community_comments")
      .select("id, comment, created_at, user_id, parent_comment_id")
      .eq("post_id", post.id)
      .eq("is_visible", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }

    if (commentsData && commentsData.length > 0) {
      const commentIds = commentsData.map(c => c.id);
      const userIds = [...new Set(commentsData.map(c => c.user_id))];

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      // Fetch like counts and user likes
      const { data: likesData } = await supabase
        .from("community_comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const likesMap = new Map<string, { count: number; isLiked: boolean }>();

      // Build likes map
      likesData?.forEach(like => {
        const current = likesMap.get(like.comment_id) || { count: 0, isLiked: false };
        likesMap.set(like.comment_id, {
          count: current.count + 1,
          isLiked: current.isLiked || like.user_id === user.id
        });
      });

      // Build comment tree
      const commentsMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      commentsData.forEach(comment => {
        const enrichedComment: Comment = {
          ...comment,
          profiles: profilesMap.get(comment.user_id) || null,
          likes_count: likesMap.get(comment.id)?.count || 0,
          is_liked: likesMap.get(comment.id)?.isLiked || false,
          replies: []
        };
        commentsMap.set(comment.id, enrichedComment);
      });

      // Organize into tree structure
      commentsMap.forEach(comment => {
        if (comment.parent_comment_id) {
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      // Sort replies by creation time (oldest first)
      rootComments.forEach(comment => {
        if (comment.replies) {
          comment.replies.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }
      });

      setComments(rootComments);
    } else {
      setComments([]);
    }
  };

  const subscribeToComments = () => {
    if (!post) return;

    const commentsChannel = supabase
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

    const likesChannel = supabase
      .channel(`comment_likes:${post.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_comment_likes",
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(likesChannel);
    };
  };

  const handleAddComment = async () => {
    if (!post || !user || !newComment.trim()) return;

    setLoading(true);
    const { error } = await supabase.from("community_comments").insert({
      post_id: post.id,
      user_id: user.id,
      comment: newComment.trim(),
      parent_comment_id: null,
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

  const handleAddReply = async (parentId: string) => {
    if (!post || !user || !replyText.trim()) return;

    setLoading(true);
    const { error } = await supabase.from("community_comments").insert({
      post_id: post.id,
      user_id: user.id,
      comment: replyText.trim(),
      parent_comment_id: parentId,
    });

    if (error) {
      console.error("Error adding reply:", error);
      toast.error("Failed to add reply");
    } else {
      setReplyText("");
      setReplyingTo(null);
      toast.success("Reply added");
    }
    setLoading(false);
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) return;

    if (isLiked) {
      const { error } = await supabase
        .from("community_comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error unliking comment:", error);
        toast.error("Failed to unlike comment");
      }
    } else {
      const { error } = await supabase
        .from("community_comment_likes")
        .insert({
          comment_id: commentId,
          user_id: user.id,
        });

      if (error) {
        console.error("Error liking comment:", error);
        toast.error("Failed to like comment");
      }
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`space-y-2 ${isReply ? "ml-10" : ""}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {comment.profiles?.full_name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold text-sm">
              {comment.profiles?.full_name || "User"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm mt-1 break-words">{comment.comment}</p>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => handleLikeComment(comment.id, comment.is_liked || false)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Heart
                className={`h-4 w-4 ${
                  comment.is_liked ? "fill-red-500 text-red-500" : ""
                }`}
              />
              {comment.likes_count ? (
                <span className="font-medium">{comment.likes_count}</span>
              ) : null}
            </button>
            {!isReply && (
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Balas
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply Input */}
      {replyingTo === comment.id && (
        <div className="ml-10 flex gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Tulis balasan..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddReply(comment.id);
              }
            }}
            disabled={loading}
            className="text-sm"
          />
          <Button
            onClick={() => handleAddReply(comment.id)}
            disabled={loading || !replyText.trim()}
            size="icon"
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => {
              setReplyingTo(null);
              setReplyText("");
            }}
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Render Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

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
                    comments.map((comment) => renderComment(comment))
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
