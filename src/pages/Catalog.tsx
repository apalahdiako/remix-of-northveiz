import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { SlidersHorizontal, ArrowUpDown, Check } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import productHoodiePecah from "@/assets/product-hoodie-pecah-front.webp";
import productJersey from "@/assets/product-jersey.jpg";
import productBall from "@/assets/product-ball.jpg";
import productHoodie from "@/assets/product-hoodie.jpg";

const products = [
  { id: "1", name: "HOODIE PECAH POLA", price: "Rp 180,000", image: productHoodiePecah, comingSoon: true },
  { id: "2", name: "KEMEJA STREETWEAR", price: "Rp 549,000", image: productJersey, comingSoon: true },
  { id: "3", name: "CALLE BALL", price: "Rp 399,000", image: productBall, comingSoon: true },
  { id: "4", name: "ZIP HOODIE - BRAZIL", price: "Rp 649,000", image: productHoodie, comingSoon: true },
];

const sortOptions = [
  "Featured",
  "Recent",
  "Oldest",
  "Most Popular",
  "Lowest Price",
  "Highest Price",
  "Product Name (A-Z)",
  "Product Name (Z-A)",
];

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [sortBy, setSortBy] = useState("Featured");
  const [sortOpen, setSortOpen] = useState(false);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter((product) =>
      product.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="container px-4 py-6">
      {/* Search Results Header */}
      {searchQuery && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">
            Hasil pencarian untuk "{searchQuery}"
          </h2>
          <p className="text-muted-foreground">
            {filteredProducts.length} produk ditemukan
          </p>
        </div>
      )}

      {/* Filter and Sort Controls */}
      <div className="flex gap-3 mb-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1 h-12 rounded-full font-semibold">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-2xl">Filters</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                  Product Type
                  <span className="text-base">↑</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="all-products" defaultChecked />
                    <label htmlFor="all-products" className="text-base">All Products</label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                  Availability
                  <span className="text-base">↑</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="all" defaultChecked />
                    <label htmlFor="all" className="text-base">All</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="in-stock" />
                    <label htmlFor="in-stock" className="text-base">In Stock</label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                  Price
                  <span className="text-base">↑</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="under-500" />
                    <label htmlFor="under-500" className="text-base">Under Rp 500,000</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="500-1000" />
                    <label htmlFor="500-1000" className="text-base">Rp 500,000 - Rp 1,000,000</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="1000-1500" />
                    <label htmlFor="1000-1500" className="text-base">Rp 1,000,000 - Rp 1,500,000</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="over-1500" />
                    <label htmlFor="over-1500" className="text-base">Rp 1,500,000 +</label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                  Size
                  <span className="text-base">↑</span>
                </h3>
                <div className="flex gap-2">
                  {["S", "M", "L", "XL", "XXL"].map((size) => (
                    <Button key={size} variant="outline" className="flex-1 rounded-full">
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6">
              <Button className="w-full h-14 rounded-full text-base font-bold bg-foreground text-background hover:bg-foreground/90">
                Apply
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={sortOpen} onOpenChange={setSortOpen}>
          <SheetTrigger asChild>
            <Button variant={sortBy === "Featured" ? "outline" : "default"} className="flex-1 h-12 rounded-full font-semibold">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-2xl">Sort products by</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-1">
              {sortOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSortBy(option);
                    setSortOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted rounded-lg transition-colors"
                >
                  <span className="font-bold text-lg">{option}</span>
                  {sortBy === option && <Check className="h-5 w-5" />}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))
        ) : (
          <div className="col-span-2 md:col-span-3 lg:col-span-4 text-center py-12">
            <p className="text-lg text-muted-foreground">
              Produk tidak ditemukan
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;
