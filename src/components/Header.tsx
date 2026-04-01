import { Menu, ShoppingBag, User, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import logoVideo from "@/assets/logo-video.webm";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

interface HeaderProps {
  onMenuClick: () => void;
  onCartClick: () => void;
  onSearchClick: () => void;
  onChatClick: () => void;
}

const Header = ({ onMenuClick, onCartClick, onSearchClick, onChatClick }: HeaderProps) => {
  const { user } = useAuth();
  const { getTotalItems } = useCart();
  const cartItemCount = getTotalItems();
  const location = useLocation();
  const isHomePage = location.pathname === "/" || location.pathname === "/home";
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const iconClass = isHomePage && !isScrolled ? "text-white hover:bg-white/10" : "";

  return (
    <header 
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        isHomePage && !isScrolled
          ? "bg-transparent border-b border-transparent" 
          : "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
      }`}
    >
      <div className="container flex h-16 items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          aria-label="Open menu"
          className={iconClass}
        >
          <Menu className="h-6 w-6" />
        </Button>

        <Link to="/" className="flex items-center">
          {isHomePage ? (
            <video autoPlay loop muted playsInline className="h-[70px] w-auto">
              <source src={logoVideo} type="video/webm" />
            </video>
          ) : (
            <img src={logo} alt="NRTVZ" className="h-[50px] w-auto" style={{ mixBlendMode: 'multiply' }} />
          )}
        </Link>

        <div className="flex items-center gap-4">
          <button onClick={onSearchClick} aria-label="Search" className={`${iconClass} p-1 transition-colors`}>
            <Search size={20} strokeWidth={1.5} />
          </button>
          <button onClick={onChatClick} aria-label="Chat" className={`${iconClass} p-1 transition-colors`}>
            <MessageCircle size={20} strokeWidth={1.5} />
          </button>
          <button onClick={onCartClick} aria-label="Cart" className={`relative ${iconClass} p-1 transition-colors`}>
            <ShoppingBag size={20} strokeWidth={1.5} />
            {cartItemCount > 0 && (
              <Badge className={`absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px] ${
                isHomePage && !isScrolled ? "bg-white text-foreground" : "bg-foreground text-background"
              }`}>
                {cartItemCount}
              </Badge>
            )}
          </button>
          <Link to={user ? "/account" : "/auth"} aria-label={user ? "Account" : "Login"} className={`${iconClass} p-1 transition-colors`}>
            <User size={20} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
