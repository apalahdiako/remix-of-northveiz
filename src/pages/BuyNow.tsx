import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const sizes = ["S", "M", "L", "XL", "XXL"];

const BuyNow = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedSize, setSelectedSize] = useState("");
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const productId = searchParams.get("id");
  const productName = searchParams.get("name");
  const productPrice = searchParams.get("price");
  const productImage = searchParams.get("image");

  const handleBuyNow = () => {
    if (!selectedSize) {
      return;
    }

    const checkoutUrl = `/checkout?productId=${productId}&name=${encodeURIComponent(
      productName || ""
    )}&price=${encodeURIComponent(productPrice || "")}&image=${encodeURIComponent(
      productImage || ""
    )}&size=${selectedSize}`;

    navigate(checkoutUrl);
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="font-semibold">Kembali</span>
      </button>

      <div className="max-w-2xl mx-auto">
        <img
          src={productImage || ""}
          alt={productName || ""}
          className="w-full aspect-square object-cover rounded-lg mb-6"
        />

        <h1 className="text-2xl font-bold mb-2">{productName}</h1>
        <p className="text-2xl font-bold mb-6">{productPrice}</p>

        <div className="mb-6">
          <h3 className="font-bold mb-3">Pilih Ukuran</h3>
          <div className="grid grid-cols-5 gap-2">
            {sizes.map((size) => (
              <Button
                key={size}
                variant={selectedSize === size ? "default" : "outline"}
                className="h-12 rounded-lg font-bold"
                onClick={() => setSelectedSize(size)}
              >
                {size}
              </Button>
            ))}
          </div>
          {!selectedSize && (
            <p className="text-sm text-destructive mt-2">Pilih ukuran terlebih dahulu</p>
          )}
        </div>

        <Button
          className="w-full h-14 rounded-full text-base font-bold"
          onClick={handleBuyNow}
          disabled={!selectedSize}
        >
          Lanjut ke Checkout
        </Button>
      </div>
    </div>
  );
};

export default BuyNow;