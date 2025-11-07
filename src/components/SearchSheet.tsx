import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Available products from catalog (exclude Coming Soon items)
const availableProducts = [
  { id: "1", name: "HOODIE PECAH POLA", price: "Rp 180,000", keywords: ["hoodie", "pecah", "pola"] },
  { id: "2", name: "KEMEJA STREETWEAR", price: "Rp 549,000", keywords: ["kemeja", "streetwear", "shirt"] },
  { id: "3", name: "CALLE BALL", price: "Rp 399,000", keywords: ["calle", "ball", "bola"] },
  { id: "4", name: "ZIP HOODIE - BRAZIL", price: "Rp 649,000", keywords: ["zip", "hoodie", "brazil"] },
];

// Popular search tags from available products
const popularSearches = [
  "HOODIE PECAH POLA",
  "KEMEJA STREETWEAR", 
  "STREETWEAR",
];

const SearchSheet = ({ open, onOpenChange }: SearchSheetProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    if (query.trim()) {
      // Navigate to catalog with search parameter
      navigate(`/catalog?search=${encodeURIComponent(query)}`);
      onOpenChange(false);
      setSearchQuery("");
    }
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    handleSearch(tag);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const filteredProducts = searchQuery.trim()
    ? availableProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.keywords.some((keyword) =>
            keyword.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="h-screen overflow-y-auto">
        <SheetHeader className="sr-only">Pencarian Produk</SheetHeader>
        
        {/* Search Input */}
        <div className="relative mb-6 mt-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari Produk Kami"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch(searchQuery);
              }
            }}
            className="pl-12 pr-12 h-14 rounded-full text-base border-2 focus-visible:ring-0 focus-visible:border-foreground"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Search Results */}
        {searchQuery.trim() && filteredProducts.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">Hasil Pencarian</h3>
            <div className="space-y-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    navigate(`/product/${product.id}`);
                    onOpenChange(false);
                    setSearchQuery("");
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted rounded-lg transition-colors text-left"
                >
                  <div>
                    <p className="font-bold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.price}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {searchQuery.trim() && filteredProducts.length === 0 && (
          <div className="mb-8 text-center py-8">
            <p className="text-muted-foreground">Produk tidak ditemukan</p>
          </div>
        )}

        {/* Popular Searches */}
        {!searchQuery.trim() && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">Pencarian Populer</h3>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map((tag, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => handleTagClick(tag)}
                  className="rounded-full font-semibold hover:bg-foreground hover:text-background transition-colors"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Recently Viewed / Available Products */}
        {!searchQuery.trim() && (
          <div>
            <h3 className="text-lg font-bold mb-4">Produk Tersedia</h3>
            <div className="space-y-3">
              {availableProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    navigate(`/product/${product.id}`);
                    onOpenChange(false);
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted rounded-lg transition-colors text-left"
                >
                  <div>
                    <p className="font-bold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.price}</p>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                    Tersedia
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default SearchSheet;
