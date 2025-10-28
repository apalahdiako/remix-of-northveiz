import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-md bg-background z-50 transition-transform duration-300 ease-out border-l border-border",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-3xl font-bold">Cart</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center h-[calc(100%-200px)] p-6">
          <h3 className="text-4xl font-bold mb-4">Your cart is empty</h3>
          <p className="text-muted-foreground text-center mb-8">
            Discover products or log in to pick up where you left off.
          </p>
          <div className="w-full space-y-3">
            <Button
              variant="outline"
              className="w-full h-14 text-base font-semibold rounded-full"
              onClick={onClose}
            >
              Continue Shopping
            </Button>
            <Button
              className="w-full h-14 text-base font-semibold rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              Login
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
