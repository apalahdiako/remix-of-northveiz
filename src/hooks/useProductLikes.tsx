import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProductLike {
  id: string;
  product_id: string;
  user_id: string;
  created_at: string;
}

export const useProductLikes = (productId: string) => {
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch like count and user's like status
  const fetchLikes = async () => {
    try {
      // Get total like count
      const { count, error: countError } = await supabase
        .from('product_likes')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId);

      if (countError) throw countError;
      setLikeCount(count || 0);

      // Check if current user has liked
      if (user) {
        const { data, error: userLikeError } = await supabase
          .from('product_likes')
          .select('id')
          .eq('product_id', productId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (userLikeError) throw userLikeError;
        setIsLiked(!!data);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  // Toggle like
  const toggleLike = async () => {
    if (!user) {
      toast.error('Silakan login terlebih dahulu untuk memberikan like');
      // Redirect to auth page
      window.location.href = '/auth';
      return;
    }

    setIsLoading(true);
    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('product_likes')
          .delete()
          .eq('product_id', productId)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        const { error } = await supabase
          .from('product_likes')
          .insert({
            product_id: productId,
            user_id: user.id
          });

        if (error) throw error;
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
        toast.success('Produk ditambahkan ke favorit');
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error('Gagal memberikan like');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchLikes();

    const channel = supabase
      .channel(`product-likes-${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_likes',
          filter: `product_id=eq.${productId}`
        },
        () => {
          fetchLikes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId, user]);

  return {
    likeCount,
    isLiked,
    isLoading,
    toggleLike
  };
};
