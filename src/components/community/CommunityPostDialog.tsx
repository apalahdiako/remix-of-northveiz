import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Send, Bookmark, Share2, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [showComments, setShowComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [postProfile, setPostProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (post && open) {
      fetchPostProfile();
      fetchComments();
      const unsubscribe = subscribeToComments();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [post, open]);

  const fetchPostProfile = async () => {
    if (!post) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", post.user_id)
      .single();
    
    if (data) {
      setPostProfile(data);
    }
  };

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

  const handleAddReply = async () => {
    if (!post || !user || !replyText.trim() || !replyingTo) return;

    setLoading(true);
    const { error } = await supabase.from("community_comments").insert({
      post_id: post.id,
      user_id: user.id,
      comment: replyText.trim(),
      parent_comment_id: replyingTo.id,
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
    <div key={comment.id} className={`${isReply ? "ml-12 mt-3" : "mb-4"}`}>
      <div className="flex gap-3">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {comment.profiles?.full_name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-sm">
                  {comment.profiles?.full_name || "User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="text-sm break-words leading-relaxed">{comment.comment}</p>
            </div>
            <button
              onClick={() => handleLikeComment(comment.id, comment.is_liked || false)}
              className="flex-shrink-0"
            >
              <Heart
                className={`h-4 w-4 ${
                  comment.is_liked ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-foreground"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2">
            {comment.likes_count > 0 && (
              <span className="text-xs text-muted-foreground font-medium">
                {comment.likes_count} {comment.likes_count === 1 ? "like" : "likes"}
              </span>
            )}
            {!isReply && (
              <button
                onClick={() => setReplyingTo({ id: comment.id, username: comment.profiles?.full_name || "User" })}
                className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Render Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  if (!post) return null;

  const totalComments = comments.reduce((acc, comment) => acc + 1 + (comment.replies?.length || 0), 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[95vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={postProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {postProfile?.full_name?.[0]?.toUpperCase() || post.instagram_username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">
                    {post.instagram_username || postProfile?.full_name || "User"}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>

            {/* Image Section */}
            <div className="relative bg-black flex items-center justify-center flex-1 overflow-hidden">
              <img
                src={post.image_url}
                alt={post.caption || "Community post"}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Action Bar */}
            <div className="px-4 py-3 border-t">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <button onClick={onLikeToggle} className="transition-transform hover:scale-110">
                    <Heart
                      className={`h-7 w-7 ${
                        isLiked ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                  </button>
                  <button 
                    onClick={() => setShowComments(true)}
                    className="transition-transform hover:scale-110"
                  >
                    <MessageCircle className="h-7 w-7" />
                  </button>
                  <button className="transition-transform hover:scale-110">
                    <Share2 className="h-6 w-6" />
                  </button>
                </div>
                <button className="transition-transform hover:scale-110">
                  <Bookmark className="h-6 w-6" />
                </button>
              </div>

              {/* Likes Count */}
              <div className="mb-2">
                <span className="font-semibold text-sm">
                  {likesCount.toLocaleString()} {likesCount === 1 ? "like" : "likes"}
                </span>
              </div>

              {/* Caption */}
              {post.caption && (
                <div className="mb-2">
                  <span className="font-semibold text-sm mr-2">
                    {post.instagram_username || postProfile?.full_name || "User"}
                  </span>
                  <span className="text-sm">{post.caption}</span>
                </div>
              )}

              {/* View Comments */}
              {totalComments > 0 && (
                <button
                  onClick={() => setShowComments(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all {totalComments} {totalComments === 1 ? "comment" : "comments"}
                </button>
              )}

              {/* Timestamp */}
              <div className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </div>
            </div>

            {/* Add Comment */}
            <div className="px-4 py-3 border-t flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.user_metadata?.full_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                disabled={loading}
                className="border-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {newComment.trim() && (
                <Button
                  onClick={handleAddComment}
                  disabled={loading}
                  variant="ghost"
                  className="text-primary hover:text-primary/80 font-semibold"
                >
                  Post
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Sheet/Overlay */}
      <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-center">Comments</SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(85vh-140px)] px-4 py-4">
            {comments.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No comments yet</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to comment</p>
              </div>
            ) : (
              <div className="space-y-1">
                {comments.map((comment) => renderComment(comment))}
              </div>
            )}
          </ScrollArea>

          {/* Comment Input in Sheet */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t bg-background">
            {replyingTo && (
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Replying to</span>
                <span className="font-semibold">@{replyingTo.username}</span>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText("");
                  }}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.user_metadata?.full_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Input
                value={replyingTo ? replyText : newComment}
                onChange={(e) => replyingTo ? setReplyText(e.target.value) : setNewComment(e.target.value)}
                placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (replyingTo) {
                      handleAddReply();
                    } else {
                      handleAddComment();
                    }
                  }
                }}
                disabled={loading}
                className="border-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {((replyingTo && replyText.trim()) || (!replyingTo && newComment.trim())) && (
                <Button
                  onClick={replyingTo ? handleAddReply : handleAddComment}
                  disabled={loading}
                  variant="ghost"
                  className="text-primary hover:text-primary/80 font-semibold"
                >
                  Post
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
