import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Smile, ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
  likes_count: number;
  is_liked: boolean;
  replies?: Comment[];
}

interface Post {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  instagram_username: string | null;
  is_pinned: boolean;
}

interface CommunityPostDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  likesCount: number;
  isLiked: boolean;
  onLikeToggle: () => void;
  allPosts?: Post[];
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function CommunityPostDialog({
  post,
  open,
  onOpenChange,
  likesCount,
  isLiked,
  onLikeToggle,
  allPosts = [],
  onNavigate,
}: CommunityPostDialogProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postProfile, setPostProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const currentIndex = allPosts.findIndex(p => p.id === post.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allPosts.length - 1;

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

    setLoadingComments(true);
    const { data: commentsData, error } = await supabase
      .from("community_comments")
      .select("id, comment, created_at, user_id, parent_comment_id")
      .eq("post_id", post.id)
      .eq("is_visible", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      setLoadingComments(false);
      return;
    }

    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const commentIds = commentsData.map(c => c.id);

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      // Fetch likes count for all comments
      const { data: likesData } = await supabase
        .from("community_comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      // Count likes per comment and check if current user liked
      const likesMap = new Map<string, { count: number; isLiked: boolean }>();
      likesData?.forEach(like => {
        const current = likesMap.get(like.comment_id) || { count: 0, isLiked: false };
        current.count++;
        if (like.user_id === user.id) current.isLiked = true;
        likesMap.set(like.comment_id, current);
      });

      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id),
        likes_count: likesMap.get(comment.id)?.count || 0,
        is_liked: likesMap.get(comment.id)?.isLiked || false,
        replies: [] as Comment[],
      }));

      const topLevelComments = commentsWithProfiles.filter(c => !c.parent_comment_id);
      topLevelComments.forEach(topComment => {
        topComment.replies = commentsWithProfiles.filter(
          c => c.parent_comment_id === topComment.id
        );
      });

      setComments(topLevelComments);
    } else {
      setComments([]);
    }
    setLoadingComments(false);
  };

  const subscribeToComments = () => {
    if (!post) return;

    const channel = supabase
      .channel(`post-${post.id}`)
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
    if (!user || !post || !newComment.trim()) return;

    const { error } = await supabase.from("community_comments").insert({
      post_id: post.id,
      user_id: user.id,
      comment: newComment.trim(),
      is_visible: true,
    });

    if (error) {
      toast.error(t("community.commentError"));
      return;
    }

    setNewComment("");
    fetchComments();
  };

  const handleAddReply = async (parentCommentId: string) => {
    if (!user || !post || !newComment.trim()) return;

    const { error } = await supabase.from("community_comments").insert({
      post_id: post.id,
      user_id: user.id,
      comment: newComment.trim(),
      parent_comment_id: parentCommentId,
      is_visible: true,
    });

    if (error) {
      toast.error(t("community.commentError"));
      return;
    }

    setNewComment("");
    setReplyingTo(null);
    fetchComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("community_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) {
      toast.error(t("community.deleteError"));
      return;
    }

    toast.success(t("community.commentDeleted"));
    fetchComments();
  };

  const handleCommentLikeToggle = async (commentId: string, currentlyLiked: boolean) => {
    if (!user) return;

    if (currentlyLiked) {
      // Unlike
      const { error } = await supabase
        .from("community_comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

      if (error) {
        toast.error("Failed to unlike comment");
        return;
      }
    } else {
      // Like
      const { error } = await supabase
        .from("community_comment_likes")
        .insert({
          comment_id: commentId,
          user_id: user.id,
        });

      if (error) {
        toast.error("Failed to like comment");
        return;
      }
    }

    fetchComments();
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwnComment = user?.id === comment.user_id;

    return (
      <div key={comment.id} className={`${isReply ? "ml-12" : ""}`}>
        <div className="flex gap-3 group">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={comment.profiles?.avatar_url || undefined} />
            <AvatarFallback>{comment.profiles?.full_name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{comment.profiles?.full_name || "User"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-1 break-words">{comment.comment}</p>
                <div className="flex items-center gap-4 mt-2">
                  <button
                    onClick={() => handleCommentLikeToggle(comment.id, comment.is_liked)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Heart
                      className={`h-3 w-3 ${
                        comment.is_liked ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                    {comment.likes_count > 0 && (
                      <span className="font-semibold">{comment.likes_count}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setReplyingTo({ id: comment.id, username: comment.profiles?.full_name || "User" })}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                  >
                    {t("community.reply")}
                  </button>
                </div>
              </div>
              {isOwnComment && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeleteComment(comment.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-[95vw] lg:max-w-6xl h-[90vh] bg-background overflow-hidden">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-50 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Navigation Arrows */}
        {hasPrev && onNavigate && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-background/80 backdrop-blur-sm hidden lg:flex"
            onClick={() => onNavigate('prev')}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
        {hasNext && onNavigate && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-background/80 backdrop-blur-sm hidden lg:flex"
            onClick={() => onNavigate('next')}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row h-full">
          {/* Left Column - Image */}
          <div className="lg:w-[60%] bg-black flex items-center justify-center relative">
            <img
              src={post.image_url}
              alt={post.caption || "Community post"}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Right Column - Info & Comments */}
          <div className="lg:w-[40%] flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={postProfile?.avatar_url || undefined} />
                  <AvatarFallback>{postProfile?.full_name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{postProfile?.full_name || "User"}</span>
                  {post.instagram_username && (
                    <span className="text-xs text-muted-foreground">@{post.instagram_username}</span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>

            {/* Comments Section - Scrollable */}
            <ScrollArea className="flex-1 p-4">
              {/* Caption as first "comment" */}
              {post.caption && (
                <div className="flex gap-3 mb-4 pb-4 border-b border-border">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={postProfile?.avatar_url || undefined} />
                    <AvatarFallback>{postProfile?.full_name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{postProfile?.full_name || "User"}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{post.caption}</p>
                  </div>
                </div>
              )}

              {/* Comments List */}
              {loadingComments ? (
                <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("community.noComments")}
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => renderComment(comment))}
                </div>
              )}
            </ScrollArea>

            {/* Action Bar */}
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onLikeToggle}
                    className="hover:bg-transparent"
                  >
                    <Heart
                      className={`h-6 w-6 transition-colors ${
                        isLiked ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:bg-transparent">
                    <MessageCircle className="h-6 w-6" />
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:bg-transparent">
                    <Share2 className="h-6 w-6" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="hover:bg-transparent">
                  <Bookmark className="h-6 w-6" />
                </Button>
              </div>

              <div className="font-semibold text-sm mb-3">
                {likesCount} {t("community.likes")}
              </div>

              <div className="text-xs text-muted-foreground mb-3">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </div>

              {/* Comment Input */}
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Smile className="h-5 w-5" />
                </Button>
                <Input
                  placeholder={
                    replyingTo
                      ? `${t("community.replyingTo")} @${replyingTo.username}...`
                      : t("community.addComment")
                  }
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      replyingTo ? handleAddReply(replyingTo.id) : handleAddComment();
                    }
                  }}
                  className="border-0 focus-visible:ring-0 px-0"
                />
                {newComment.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={replyingTo ? () => handleAddReply(replyingTo.id) : handleAddComment}
                    className="text-primary font-semibold shrink-0"
                  >
                    {t("community.post")}
                  </Button>
                )}
              </div>
              {replyingTo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(null)}
                  className="mt-2 text-xs"
                >
                  {t("common.cancel")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
