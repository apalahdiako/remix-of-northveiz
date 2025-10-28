import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Account = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">My Account</h1>

        {/* User Info Card */}
        <div className="bg-background rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.email}</h2>
              <p className="text-muted-foreground text-sm">Member since {new Date(user.created_at || "").toLocaleDateString()}</p>
            </div>
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
