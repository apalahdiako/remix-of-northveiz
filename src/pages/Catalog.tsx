import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  stock_status: 'available' | 'out_of_stock' | 'coming_soon';
}

interface Look {
  id: string;
  title: string;
  season: string;
  description: string;
  mainImage: string;
  blurredImages: string[];
  products: Product[];
}

const Catalog = () => {
  const [looks, setLooks] = useState<Look[]>([]);
  const [currentLookIndex, setCurrentLookIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { t } = useTranslation();

  useEffect(() => {
    fetchLooksData();
  }, []);

  const fetchLooksData = async () => {
    try {
      setLoading(true);
      
      // Fetch all products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) throw productsError;

      // Fetch product images
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('product_id, image_url, image_type, is_primary, display_order')
        .order('display_order', { ascending: true });

      if (imagesError) throw imagesError;

      // Map images to products
      const imagesMap: Record<string, { front: string; back?: string; all: string[] }> = {};
      
      if (imagesData) {
        const imagesByProduct = imagesData.reduce((acc: any, img: any) => {
          if (!acc[img.product_id]) {
            acc[img.product_id] = [];
          }
          acc[img.product_id].push(img);
          return acc;
        }, {});

        Object.keys(imagesByProduct).forEach(productId => {
          const images = imagesByProduct[productId];
          const frontImage = images.find((img: any) => img.image_type === 'front');
          const backImage = images.find((img: any) => img.image_type === 'back');
          const primaryImage = images.find((img: any) => img.is_primary);
          
          imagesMap[productId] = {
            front: frontImage?.image_url || primaryImage?.image_url || images[0]?.image_url,
            back: backImage?.image_url,
            all: images.map((img: any) => img.image_url)
          };
        });
      }

      // Create looks by grouping products
      const productsWithImages: Product[] = (productsData || []).map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        stock_status: product.stock_status as 'available' | 'out_of_stock' | 'coming_soon',
        image: imagesMap[product.id]?.front || product.image
      }));

      // Group products into looks (3-4 products per look)
      const generatedLooks: Look[] = [];
      const productsPerLook = 3;
      
      for (let i = 0; i < productsWithImages.length; i += productsPerLook) {
        const lookProducts = productsWithImages.slice(i, i + productsPerLook);
        const lookNumber = Math.floor(i / productsPerLook) + 1;
        
        generatedLooks.push({
          id: `look-${lookNumber}`,
          title: `Look ${lookNumber}`,
          season: "Spring Summer 2025",
          description: `Curated collection featuring ${lookProducts.length} pieces`,
          mainImage: lookProducts[0]?.image || '/placeholder.svg',
          blurredImages: lookProducts.slice(1).map(p => p.image).filter(Boolean),
          products: lookProducts
        });
      }

      setLooks(generatedLooks);
    } catch (error) {
      console.error('Error fetching catalog data:', error);
      toast.error('Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleNextLook = () => {
    if (currentLookIndex < looks.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentLookIndex(prev => prev + 1);
      setTimeout(() => setIsTransitioning(false), 600);
    }
  };

  const handlePrevLook = () => {
    if (currentLookIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentLookIndex(prev => prev - 1);
      setTimeout(() => setIsTransitioning(false), 600);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock_status !== 'available') {
      toast.error('This product is not available');
      return;
    }
    
    addItem({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price.replace(/[^0-9.-]+/g, '')),
      image: product.image,
      size: 'M'
    });
    
    toast.success(`${product.name} added to cart`);
  };

  const handleAddAllToCart = () => {
    const currentLook = looks[currentLookIndex];
    const availableProducts = currentLook.products.filter(p => p.stock_status === 'available');
    
    if (availableProducts.length === 0) {
      toast.error('No available products in this look');
      return;
    }

    availableProducts.forEach(product => {
      addItem({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price.replace(/[^0-9.-]+/g, '')),
        image: product.image,
        size: 'M'
      });
    });
    
    toast.success(`${availableProducts.length} items added to cart`);
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading lookbook...</p>
        </div>
      </div>
    );
  }

  if (looks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No looks available</p>
      </div>
    );
  }

  const currentLook = looks[currentLookIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout: 3 Columns */}
      <div className="hidden lg:grid lg:grid-cols-[300px_1fr_350px] h-screen">
        {/* Left Column: Description + Blurred Models */}
        <div className="relative overflow-hidden border-r border-border">
          <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {currentLook.season}
                </p>
                <h1 className="text-4xl font-bold tracking-tight">
                  {currentLook.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {currentLook.description}
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {currentLookIndex + 1} / {looks.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevLook}
                    disabled={currentLookIndex === 0 || isTransitioning}
                    className="rounded-full"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextLook}
                    disabled={currentLookIndex === looks.length - 1 || isTransitioning}
                    className="rounded-full"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleAddAllToCart}
              className="w-full rounded-full font-bold"
              size="lg"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Shop This Look
            </Button>
          </div>

          {/* Blurred Background Images */}
          <div className="absolute inset-0 opacity-20 blur-md">
            {currentLook.blurredImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ 
                  opacity: 0.5 - (idx * 0.2),
                  transform: `scale(${1.1 + (idx * 0.1)})` 
                }}
              />
            ))}
          </div>
        </div>

        {/* Center Column: Main Model Image */}
        <div className="relative overflow-hidden bg-muted">
          <div 
            className={`absolute inset-0 transition-all duration-600 ${
              isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
          >
            <img
              src={currentLook.mainImage}
              alt={currentLook.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            
            {/* Image Overlay for Depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
          </div>

          {/* Navigation Arrows on Image */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-20">
            <Button
              variant="secondary"
              size="icon"
              onClick={handlePrevLook}
              disabled={currentLookIndex === 0 || isTransitioning}
              className="rounded-full backdrop-blur-sm bg-background/80 hover:bg-background/90"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleNextLook}
              disabled={currentLookIndex === looks.length - 1 || isTransitioning}
              className="rounded-full backdrop-blur-sm bg-background/80 hover:bg-background/90"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Right Column: Product List */}
        <div className="overflow-y-auto border-l border-border">
          <div className="p-6 space-y-4">
            <div className="sticky top-0 bg-background pb-4 border-b border-border z-10">
              <h2 className="text-lg font-bold uppercase tracking-tight">
                Products ({currentLook.products.length})
              </h2>
            </div>

            <div className="space-y-4">
              {currentLook.products.map((product) => (
                <div
                  key={product.id}
                  className="group cursor-pointer"
                  onClick={() => handleProductClick(product.id)}
                >
                  <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm uppercase tracking-tight mb-1">
                          {product.name}
                        </h3>
                        <p className="font-bold text-sm">{product.price}</p>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        disabled={product.stock_status !== 'available'}
                      >
                        {product.stock_status === 'available' ? (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </>
                        ) : product.stock_status === 'coming_soon' ? (
                          'Coming Soon'
                        ) : (
                          'Out of Stock'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout: Stacked Vertical */}
      <div className="lg:hidden">
        <div className="relative">
          {/* Main Image */}
          <div className="relative aspect-[3/4] overflow-hidden bg-muted">
            <img
              src={currentLook.mainImage}
              alt={currentLook.title}
              className={`w-full h-full object-cover transition-all duration-600 ${
                isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
              loading="lazy"
            />
            
            {/* Navigation Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3 z-20">
              <Button
                variant="secondary"
                size="icon"
                onClick={handlePrevLook}
                disabled={currentLookIndex === 0 || isTransitioning}
                className="rounded-full backdrop-blur-sm bg-background/80"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleNextLook}
                disabled={currentLookIndex === looks.length - 1 || isTransitioning}
                className="rounded-full backdrop-blur-sm bg-background/80"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Look Counter */}
            <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
              <p className="text-xs font-bold">
                {currentLookIndex + 1} / {looks.length}
              </p>
            </div>
          </div>

          {/* Description Section */}
          <div className="p-6 space-y-4 border-b border-border">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {currentLook.season}
              </p>
              <h1 className="text-3xl font-bold tracking-tight">
                {currentLook.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentLook.description}
              </p>
            </div>

            <Button 
              onClick={handleAddAllToCart}
              className="w-full rounded-full font-bold"
              size="lg"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Shop This Look
            </Button>
          </div>

          {/* Products List */}
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-tight">
              Products ({currentLook.products.length})
            </h2>

            <div className="space-y-4">
              {currentLook.products.map((product) => (
                <div
                  key={product.id}
                  className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleProductClick(product.id)}
                >
                  <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm uppercase tracking-tight mb-1">
                        {product.name}
                      </h3>
                      <p className="font-bold text-sm">{product.price}</p>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                      disabled={product.stock_status !== 'available'}
                    >
                      {product.stock_status === 'available' ? (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </>
                      ) : product.stock_status === 'coming_soon' ? (
                        'Coming Soon'
                      ) : (
                        'Out of Stock'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Catalog;