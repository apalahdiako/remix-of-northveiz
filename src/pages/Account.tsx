import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package } from "lucide-react";

const Account = () => {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">My Account</h1>

        {/* Login/Signup Card */}
        <div className="bg-background rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-bold mb-3">
            Enjoy Special Discounts and Stay Connected
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Get access to exclusive discounts while keeping track of your orders and chats with ease. Stay updated on your purchases and engage with us seamlessly, all in one place.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-full font-bold text-base"
            >
              Login
            </Button>
            <Button
              className="flex-1 h-12 rounded-full font-bold text-base bg-foreground text-background hover:bg-foreground/90"
            >
              Signup
            </Button>
          </div>
        </div>

        {/* Orders Section */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-12 mb-6">
            <TabsTrigger value="orders" className="font-bold text-base">
              Orders
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="font-bold text-base">
              Wishlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">My Orders (0)</h3>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px] rounded-full">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Empty State */}
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-32 h-32 rounded-2xl border-2 border-muted flex items-center justify-center mb-6">
                <Package className="w-16 h-16 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold mb-2">No Orders Found</h3>
              <p className="text-muted-foreground">
                Place an order to see it listed here.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="wishlist" className="mt-0">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-32 h-32 rounded-2xl border-2 border-muted flex items-center justify-center mb-6">
                <Package className="w-16 h-16 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold mb-2">No Items in Wishlist</h3>
              <p className="text-muted-foreground">
                Add items to your wishlist to see them here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Account;
