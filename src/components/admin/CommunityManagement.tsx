import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Eye, EyeOff, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  is_visible: boolean;
  instagram_username: string | null;
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  is_visible: boolean;
  user_id: string;
  profiles?: {
    full_name: string | null;
  };
  community_posts?: {
    caption: string | null;
  };
}

export function CommunityManagement() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchComments();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      return;
    }

    setPosts(data || []);
  };

  const fetchComments = async () => {
    const { data: commentsData, error } = await supabase
      .from("community_comments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }

    // Fetch related data separately
    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const postIds = [...new Set(commentsData.map(c => c.post_id))];

      const [{ data: profilesData }, { data: postsData }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", userIds),
        supabase.from("community_posts").select("id, caption").in("id", postIds)
      ]);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const postsMap = new Map(postsData?.map(p => [p.id, p]) || []);

      const enrichedComments = commentsData.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || null,
        community_posts: postsMap.get(comment.post_id) || null
      }));

      setComments(enrichedComments);
    } else {
      setComments([]);
    }
  };

  const handleAddPost = async () => {
    if (!imageUrl.trim()) {
      toast.error("Image URL is required");
      return;
    }

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("community_posts").insert({
      image_url: imageUrl.trim(),
      caption: caption.trim() || null,
      instagram_username: instagramUsername.trim() || null,
      user_id: userData.user.id,
    });

    if (error) {
      console.error("Error adding post:", error);
      toast.error("Failed to add post");
    } else {
      toast.success("Post added successfully");
      setImageUrl("");
      setCaption("");
      setInstagramUsername("");
      fetchPosts();
    }
    setLoading(false);
  };

  const handleTogglePostVisibility = async (postId: string, isVisible: boolean) => {
    const { error } = await supabase
      .from("community_posts")
      .update({ is_visible: !isVisible })
      .eq("id", postId);

    if (error) {
      console.error("Error updating post:", error);
      toast.error("Failed to update post");
    } else {
      toast.success(`Post ${!isVisible ? "shown" : "hidden"}`);
      fetchPosts();
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } else {
      toast.success("Post deleted");
      fetchPosts();
    }
  };

  const handleToggleCommentVisibility = async (commentId: string, isVisible: boolean) => {
    const { error } = await supabase
      .from("community_comments")
      .update({ is_visible: !isVisible })
      .eq("id", commentId);

    if (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    } else {
      toast.success(`Comment ${!isVisible ? "shown" : "hidden"}`);
      fetchComments();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    const { error } = await supabase
      .from("community_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    } else {
      toast.success("Comment deleted");
      fetchComments();
    }
  };

  return (
    <div className="space-y-8">
      {/* Add New Post */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Community Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Image URL</label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Caption (Optional)</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Instagram Username (Optional)</label>
            <Input
              value={instagramUsername}
              onChange={(e) => setInstagramUsername(e.target.value)}
              placeholder="@username"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter Instagram username (with or without @). Will be displayed as a clickable link.
            </p>
          </div>
          <Button onClick={handleAddPost} disabled={loading}>
            <Upload className="h-4 w-4 mr-2" />
            Add Post
          </Button>
        </CardContent>
      </Card>

      {/* Manage Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Posts ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {posts.map((post) => (
              <div key={post.id} className="relative group">
                <img
                  src={post.image_url}
                  alt={post.caption || "Community post"}
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleTogglePostVisibility(post.id, post.is_visible)}
                  >
                    {post.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDeletePost(post.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {!post.is_visible && (
                  <Badge className="absolute top-2 right-2" variant="secondary">
                    Hidden
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Moderate Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Moderate Comments ({comments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Post</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comments.map((comment) => (
                <TableRow key={comment.id}>
                  <TableCell>{comment.profiles?.full_name || "Unknown"}</TableCell>
                  <TableCell className="max-w-xs truncate">{comment.comment}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {comment.community_posts?.caption || "No caption"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={comment.is_visible ? "default" : "secondary"}>
                      {comment.is_visible ? "Visible" : "Hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleToggleCommentVisibility(comment.id, comment.is_visible)}
                      >
                        {comment.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
