import { Menu, ShoppingBag, User, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

interface HeaderProps {
  onMenuClick: () => void;
  onCartClick: () => void;
  onSearchClick: () => void;
}

const Header = ({ onMenuClick, onCartClick, onSearchClick }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const { getTotalItems } = useCart();
  const cartItemCount = getTotalItems();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 z-40 w-full transition-all duration-300 ${
        isScrolled 
          ? "bg-background border-b border-border shadow-sm" 
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container flex h-16 items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          aria-label="Open menu"
          className={!isScrolled ? "text-white hover:bg-white/10" : ""}
        >
          <Menu className="h-6 w-6" />
        </Button>

        <Link to="/" className="flex items-center">
          <img src={logo} alt="NRTVZ" className="h-10 w-auto md:h-12" />
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearchClick}
            aria-label="Search products"
            className={!isScrolled ? "text-white hover:bg-white/10" : ""}
          >
            <Search className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCartClick}
            aria-label="Shopping cart"
            className={`relative ${!isScrolled ? "text-white hover:bg-white/10" : ""}`}
          >
            <ShoppingBag className="h-6 w-6" />
            {cartItemCount > 0 && (
              <Badge className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs ${
                isScrolled ? "bg-foreground text-background" : "bg-white text-foreground"
              }`}>
                {cartItemCount}
              </Badge>
            )}
          </Button>
          {user ? (
            <>
              <Link to="/account">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  aria-label="Account"
                  className={!isScrolled ? "text-white hover:bg-white/10" : ""}
                >
                  <User className="h-6 w-6" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                aria-label="Logout"
                className={!isScrolled ? "text-white hover:bg-white/10" : ""}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Login"
                className={!isScrolled ? "text-white hover:bg-white/10" : ""}
              >
                <User className="h-6 w-6" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
