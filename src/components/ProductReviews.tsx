import { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface Review {
  id: string;
  rating: number;
  comment: string;
  is_verified_buyer: boolean;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export const ProductReviews = ({ productId, productName }: ProductReviewsProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [isVerifiedBuyer, setIsVerifiedBuyer] = useState(false);

  useEffect(() => {
    if (user) {
      fetchReviews();
      checkUserReview();
      checkVerifiedBuyer();
    } else {
      fetchReviews();
    }
  }, [productId, user]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data: reviewsData, error } = await supabase
        .from('product_reviews')
        .select('id, rating, comment, is_verified_buyer, created_at, user_id')
        .eq('product_id', productId)
        .eq('is_moderated', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      if (reviewsData && reviewsData.length > 0) {
        const userIds = reviewsData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        // Merge reviews with profiles
        const reviewsWithProfiles = reviewsData.map(review => ({
          ...review,
          profiles: profilesData?.find(p => p.id === review.user_id) || { full_name: null, avatar_url: null }
        }));
        
        setReviews(reviewsWithProfiles as any);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserReview = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setHasUserReviewed(!!data);
    } catch (error) {
      console.error('Error checking user review:', error);
    }
  };

  const checkVerifiedBuyer = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .eq('order_status', 'completed')
        .limit(1);

      if (error) throw error;
      setIsVerifiedBuyer((data?.length || 0) > 0);
    } catch (error) {
      console.error('Error checking verified buyer:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: "Login Diperlukan",
        description: "Silakan login terlebih dahulu untuk memberikan ulasan",
        variant: "destructive",
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Rating Diperlukan",
        description: "Silakan pilih rating bintang terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (comment.length < 10) {
      toast({
        title: "Komentar Terlalu Pendek",
        description: "Komentar minimal 10 karakter",
        variant: "destructive",
      });
      return;
    }

    if (comment.length > 500) {
      toast({
        title: "Komentar Terlalu Panjang",
        description: "Komentar maksimal 500 karakter",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('product_reviews')
        .insert({
          product_id: productId,
          user_id: user.id,
          rating,
          comment,
          is_verified_buyer: isVerifiedBuyer,
        });

      if (error) throw error;

      toast({
        title: "Ulasan Berhasil Dikirim",
        description: "Terima kasih atas ulasan Anda!",
      });

      setRating(0);
      setComment("");
      setHasUserReviewed(true);
      fetchReviews();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: "Gagal Mengirim Ulasan",
        description: error.message || "Terjadi kesalahan, silakan coba lagi",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <Star
              className={`w-6 h-6 ${
                star <= (interactive ? (hoverRating || rating) : rating)
                  ? 'fill-yellow-500 text-yellow-500'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-8">
      {/* Prominent Rating Summary */}
      {reviews.length > 0 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-3">
                {renderStars(Math.round(parseFloat(averageRating.toString())))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-5xl font-bold text-primary">{averageRating}</span>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">dari 5.0</span>
                  <span className="text-sm font-semibold">({reviews.length} Ulasan)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Form - Only for logged-in users who haven't reviewed */}
      {user && !hasUserReviewed && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-xl font-bold mb-4">Berikan Ulasan Anda untuk Produk Ini</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Rating <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {renderStars(rating, true)}
                  <span className="text-sm text-muted-foreground ml-2">
                    Klik untuk memberi penilaian
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Komentar <span className="text-destructive">*</span>
                </label>
                <Textarea
                  placeholder={`Bagikan pengalaman Anda menggunakan produk ${productName}...`}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[120px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {comment.length}/500 karakter {comment.length < 10 && `(minimal 10)`}
                </p>
              </div>

              <Button
                onClick={handleSubmitReview}
                disabled={submitting || rating === 0 || comment.length < 10 || comment.length > 500}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  'Kirim Ulasan Anda'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews Display */}
      <div>
        <div className="mb-6">
          <h3 className="text-2xl font-bold">
            Ulasan Pelanggan untuk {productName}
            {reviews.length > 0 && (
              <span className="ml-2 text-lg text-muted-foreground">
                ({reviews.length})
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {user 
                  ? "Belum ada ulasan untuk produk ini. Jadilah yang pertama memberikan ulasan!"
                  : "Belum ada ulasan untuk produk ini. Login untuk memberikan ulasan pertama!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={review.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {review.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-lg">
                          {review.profiles?.full_name || 'Pengguna'}
                        </p>
                        {review.is_verified_buyer && (
                          <Badge variant="secondary" className="text-xs">
                            Pembeli Terverifikasi
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(review.created_at), "d MMMM yyyy, HH:mm", { locale: idLocale })} WIB
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    {renderStars(review.rating)}
                  </div>
                  
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    "{review.comment}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {!user && (
        <Card className="border-primary/20">
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground mb-4">
              Login untuk melihat ulasan dan memberikan ulasan Anda sendiri
            </p>
            <Button
              onClick={() => window.location.href = '/auth'}
              variant="outline"
            >
              Login Sekarang
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
