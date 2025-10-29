import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, Package, MapPin, LogOut, Edit, Trash2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import productHoodie from "@/assets/product-hoodie.jpg";

type MenuTab = "profile" | "orders" | "addresses" | "logout";

interface Order {
  id: string;
  date: string;
  status: "delivered" | "processing" | "cancelled";
  items: {
    image: string;
    name: string;
    size: string;
    quantity: number;
    price: number;
  }[];
  total: number;
}

interface Address {
  id: string;
  name: string;
  isDefault: boolean;
  street: string;
  city: string;
  phone: string;
}

// Mock data for demonstration
const mockOrders: Order[] = [
  {
    id: "ORD-2025-001",
    date: "15/11/2025",
    status: "delivered",
    items: [
      {
        image: productHoodie,
        name: "Black Oversized Hoodie",
        size: "M",
        quantity: 1,
        price: 450000
      }
    ],
    total: 450000
  },
  {
    id: "ORD-2025-002",
    date: "18/11/2025",
    status: "processing",
    items: [
      {
        image: productHoodie,
        name: "Grey Essential Hoodie",
        size: "L",
        quantity: 1,
        price: 425000
      },
      {
        image: productHoodie,
        name: "Streetwear Black Jacket",
        size: "M",
        quantity: 1,
        price: 650000
      }
    ],
    total: 925000
  },
  {
    id: "ORD-2025-003",
    date: "10/11/2025",
    status: "cancelled",
    items: [
      {
        image: productHoodie,
        name: "Classic Black Tee",
        size: "M",
        quantity: 1,
        price: 250000
      }
    ],
    total: 250000
  }
];

const mockAddresses: Address[] = [
  {
    id: "1",
    name: "Jhonn",
    isDefault: true,
    street: "Jl. pangeran kejaksan",
    city: "Kota cirebon, JAWA BARAT 45612",
    phone: "081312367085"
  }
];

const Account = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MenuTab>("profile");
  const [addresses, setAddresses] = useState<Address[]>(mockAddresses);
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logged out successfully" });
    navigate("/");
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
    toast({ title: "Address deleted" });
  };

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

  const getStatusBadge = (status: Order["status"]) => {
    const variants = {
      delivered: "bg-green-100 text-green-800",
      processing: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return (
      <Badge className={`${variants[status]} capitalize`} variant="secondary">
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">My Account</h1>
        <p className="text-muted-foreground text-sm mb-8">Manage your profile and orders</p>

        {/* User Info Card */}
        <div className="bg-background rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center">
              <span className="text-2xl font-bold">D</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">{user.email?.split('@')[0] || 'User'}</h2>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Menu Navigation */}
        <div className="bg-background rounded-2xl shadow-sm mb-6 overflow-hidden">
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-6 py-4 text-left transition-colors ${
              activeTab === "profile" ? "bg-foreground text-background" : "hover:bg-muted"
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="font-medium">Profile</span>
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center gap-3 px-6 py-4 text-left transition-colors border-t ${
              activeTab === "orders" ? "bg-foreground text-background" : "hover:bg-muted"
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">Orders</span>
          </button>
          <button
            onClick={() => setActiveTab("addresses")}
            className={`w-full flex items-center gap-3 px-6 py-4 text-left transition-colors border-t ${
              activeTab === "addresses" ? "bg-foreground text-background" : "hover:bg-muted"
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span className="font-medium">Addresses</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-4 text-left transition-colors border-t hover:bg-muted"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>

        {/* Profile View */}
        {activeTab === "profile" && (
          <div className="bg-background rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">PROFILE DETAILS</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b">
                <span className="text-muted-foreground">Name</span>
                {isEditing ? (
                  <Input className="w-48 h-8" defaultValue={user.email?.split('@')[0]} />
                ) : (
                  <span className="font-medium">{user.email?.split('@')[0]}</span>
                )}
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-muted-foreground">Phone</span>
                {isEditing ? (
                  <Input 
                    className="w-48 h-8" 
                    placeholder="Not set"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                ) : (
                  <span className="font-medium text-muted-foreground">Not set</span>
                )}
              </div>
            </div>

            {isEditing && (
              <Button className="w-full mt-6" onClick={() => {
                setIsEditing(false);
                toast({ title: "Profile updated successfully" });
              }}>
                Save Changes
              </Button>
            )}
          </div>
        )}

        {/* Orders View */}
        {activeTab === "orders" && (
          <div>
            <h2 className="text-xl font-bold mb-6">ORDER HISTORY</h2>
            <div className="space-y-4">
              {mockOrders.map((order) => (
                <div key={order.id} className="bg-background rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold">{order.id}</h3>
                      <p className="text-sm text-muted-foreground">Placed on {order.date}</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="space-y-3 mb-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Size: {item.size} • Qty: {item.quantity}
                          </p>
                          <p className="font-medium">Rp {item.price.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-muted-foreground">Total</span>
                      <span className="text-xl font-bold">Rp {order.total.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-3">
                      {order.status === "processing" && (
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => toast({ title: "Order cancelled" })}
                        >
                          Cancel Order
                        </Button>
                      )}
                      {order.status === "delivered" && (
                        <Button variant="outline" className="flex-1">Track Order</Button>
                      )}
                      <Button variant="default" className="flex-1">View Details</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Addresses View */}
        {activeTab === "addresses" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">SHIPPING ADDRESSES</h2>
              <Button onClick={() => toast({ title: "Add address feature coming soon" })}>
                <Plus className="w-4 h-4 mr-2" />
                ADD NEW
              </Button>
            </div>

            <div className="space-y-4">
              {addresses.map((address) => (
                <div key={address.id} className="bg-background rounded-2xl p-6 shadow-sm border-2">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold">{address.name}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAddress(address.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {address.isDefault && (
                    <Badge className="bg-foreground text-background mb-3">DEFAULT</Badge>
                  )}
                  <p className="text-sm mb-1">{address.street}</p>
                  <p className="text-sm mb-2">{address.city}</p>
                  <p className="text-sm">{address.phone}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
