import { Menu, ShoppingBag, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  onMenuClick: () => void;
  onCartClick: () => void;
}

const Header = ({ onMenuClick, onCartClick }: HeaderProps) => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-background border-b border-border">
      <div className="container flex h-16 items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          aria-label="Open menu"
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
            onClick={onCartClick}
            aria-label="Shopping cart"
          >
            <ShoppingBag className="h-6 w-6" />
          </Button>
          {user ? (
            <>
              <Link to="/account">
                <Button variant="ghost" size="icon" aria-label="Account">
                  <User className="h-6 w-6" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="icon" aria-label="Login">
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
