import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import Header from "./components/Header";
import MobileMenu from "./components/MobileMenu";
import CartDrawer from "./components/CartDrawer";
import SearchSheet from "./components/SearchSheet";
import ChatWindow from "./components/ChatWindow";
import AdminChatPanel from "./components/AdminChatPanel";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Account from "./pages/Account";
import Community from "./pages/Community";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import BuyNow from "./pages/BuyNow";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import AdminDashboard from "./pages/AdminDashboard";
import PetaGlobal from "./pages/PetaGlobal";
import TrackingPage from "./pages/TrackingPage";
import { AuthProvider } from "./hooks/useAuth";
import { CartProvider } from "./hooks/useCart";

const queryClient = new QueryClient();

function AppContent() {
  useVisitorTracking();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get("mode") === "admin";

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMenuClick={() => setMenuOpen(true)} 
        onCartClick={() => setCartOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
        onChatClick={() => setChatOpen(true)}
      />
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <SearchSheet open={searchOpen} onOpenChange={setSearchOpen} />
      
      {isAdminMode ? (
        <AdminChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      ) : (
        <ChatWindow open={chatOpen} onClose={() => setChatOpen(false)} />
      )}
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/account" element={<Account />} />
        <Route path="/community" element={<Community />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/buy-now" element={<BuyNow />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/peta-global" element={<PetaGlobal />} />
        <Route path="/track/:resi" element={<TrackingPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
