import { Menu, ShoppingBag, User, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, NavLink, useLocation } from "react-router-dom";
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

const NAV_LINKS = [
  { to: "/catalog", label: "Shop" },
  { to: "/community", label: "Community" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const Header = ({ onMenuClick, onCartClick, onSearchClick, onChatClick }: HeaderProps) => {
  const { user } = useAuth();
  const { getTotalItems } = useCart();
  const cartItemCount = getTotalItems();
  const location = useLocation();
  const isHomePage = location.pathname === "/" || location.pathname === "/home";
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const transparent = isHomePage && !isScrolled;
  const iconClass = transparent ? "text-white hover:opacity-70" : "text-foreground hover:opacity-70";

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        transparent
          ? "bg-transparent"
          : "bg-background/90 backdrop-blur-md border-b border-border/60"
      }`}
    >
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        {/* Left: hamburger (mobile) + nav (desktop) */}
        <div className="flex items-center gap-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            aria-label="Open menu"
            className={`md:hidden ${iconClass}`}
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </Button>
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `eyebrow transition-opacity hover:opacity-60 ${
                    transparent ? "text-white" : "text-foreground"
                  } ${isActive ? "opacity-100" : "opacity-90"}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Center: logo */}
        <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex items-center">
          {isHomePage ? (
            <video autoPlay loop muted playsInline className="h-[60px] w-auto">
              <source src={logoVideo} type="video/webm" />
            </video>
          ) : (
            <img
              src={logo}
              alt="NRTVZ"
              className="h-[42px] w-auto"
              style={{ mixBlendMode: "multiply" }}
            />
          )}
        </Link>

        {/* Right: icons */}
        <div className="flex items-center gap-5">
          <button onClick={onSearchClick} aria-label="Search" className={`${iconClass} transition-opacity`}>
            <Search size={18} strokeWidth={1.5} />
          </button>
          <button onClick={onChatClick} aria-label="Chat" className={`hidden sm:inline-flex ${iconClass} transition-opacity`}>
            <MessageCircle size={18} strokeWidth={1.5} />
          </button>
          <Link
            to={user ? "/account" : "/auth"}
            aria-label={user ? "Account" : "Login"}
            className={`hidden sm:inline-flex ${iconClass} transition-opacity`}
          >
            <User size={18} strokeWidth={1.5} />
          </Link>
          <button onClick={onCartClick} aria-label="Cart" className={`relative ${iconClass} transition-opacity`}>
            <ShoppingBag size={18} strokeWidth={1.5} />
            {cartItemCount > 0 && (
              <Badge
                className={`absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[10px] rounded-full ${
                  transparent ? "bg-white text-foreground" : "bg-foreground text-background"
                }`}
              >
                {cartItemCount}
              </Badge>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
