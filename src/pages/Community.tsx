import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, Pin } from "lucide-react";
import { CommunityPostDialog } from "@/components/community/CommunityPostDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

interface Post {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  instagram_username: string | null;
  is_pinned: boolean;
}

interface PostWithStats extends Post {
  likesCount: number;
  isLiked: boolean;
  latestComment?: string;
  commentsCount: number;
}

const Community = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPosts();
      subscribeToUpdates();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPosts = async () => {
    if (!user) return;

    const { data: postsData, error: postsError } = await supabase
      .from("community_posts")
      .select("*")
      .eq("is_visible", true)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("Error fetching posts:", postsError);
      setLoading(false);
      return;
    }

    // Fetch likes and comments for all posts
    const postsWithStats: PostWithStats[] = await Promise.all(
      (postsData || []).map(async (post) => {
        const { count: likesCount } = await supabase
          .from("community_likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        const { data: userLike } = await supabase
          .from("community_likes")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .maybeSingle();

        const { count: commentsCount } = await supabase
          .from("community_comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id)
          .eq("is_visible", true);

        const { data: latestCommentData } = await supabase
          .from("community_comments")
          .select("comment")
          .eq("post_id", post.id)
          .eq("is_visible", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...post,
          likesCount: likesCount || 0,
          isLiked: !!userLike,
          latestComment: latestCommentData?.comment,
          commentsCount: commentsCount || 0,
        };
      })
    );

    setPosts(postsWithStats);
    setLoading(false);
  };

  const subscribeToUpdates = () => {
    const postsChannel = supabase
      .channel("community_posts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_posts",
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    const likesChannel = supabase
      .channel("community_likes_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_likes",
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
    };
  };

  const handleLikeToggle = async (post: PostWithStats) => {
    if (!user) return;

    if (post.isLiked) {
      // Unlike
      await supabase
        .from("community_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
    } else {
      // Like
      await supabase.from("community_likes").insert({
        post_id: post.id,
        user_id: user.id,
      });
    }

    // Update local state immediately for better UX
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              isLiked: !p.isLiked,
              likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
            }
          : p
      )
    );
  };

  const openPostDialog = (post: Post) => {
    setSelectedPost(post);
    setDialogOpen(true);
  };

  if (!user) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 pt-24 text-center max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{t("community.title")}</h1>
        <p className="text-muted-foreground mb-8">
          {t("community.loginRequired")}
        </p>
        <Button asChild>
          <Link to="/auth">{t("nav.login")}</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pt-24 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{t("community.title")}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-1 sm:gap-2 md:gap-3">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="rounded-lg w-full" style={{ aspectRatio: '3/4' }} />
          ))}
        </div>
      </div>
    );
  }

  const selectedPostWithStats = posts.find((p) => p.id === selectedPost?.id);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pt-24 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">{t("community.title")}</h1>

      {posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">{t("community.noPostsYet")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-1 sm:gap-2 md:gap-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col gap-1 sm:gap-2 cursor-pointer"
              onClick={() => openPostDialog(post)}
            >
              <div className="relative group overflow-hidden rounded-lg bg-muted w-full" style={{ aspectRatio: '3/4' }}>
                <img
                  src={post.image_url}
                  alt={post.caption || "Community post"}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {post.is_pinned && (
                  <div className="absolute top-2 right-2 bg-primary/90 backdrop-blur-sm rounded-full p-1.5 sm:p-2">
                    <Pin className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground fill-primary-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex items-center gap-4 text-white">
                    <div className="flex items-center gap-1">
                      <Heart className="h-5 w-5 sm:h-6 sm:w-6 fill-white" />
                      <span className="font-semibold text-sm sm:text-base">{post.likesCount}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1 px-1">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span className="font-semibold">{post.likesCount} {t("community.likes")}</span>
                </div>
                {post.latestComment && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                    {post.latestComment}
                  </p>
                )}
                {post.commentsCount > 0 && (
                  <button className="text-[10px] sm:text-xs text-muted-foreground text-left hover:text-foreground transition-colors">
                    {t("community.viewAllComments", { count: post.commentsCount })}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPost && selectedPostWithStats && (
        <CommunityPostDialog
          post={selectedPost}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          likesCount={selectedPostWithStats.likesCount}
          isLiked={selectedPostWithStats.isLiked}
          onLikeToggle={() => handleLikeToggle(selectedPostWithStats)}
        />
      )}
    </div>
  );
};

export default Community;
