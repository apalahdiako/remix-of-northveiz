import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, Package, MapPin, LogOut, Edit, Trash2, Plus, Save, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { OrdersList } from "@/components/orders/OrdersList";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type MenuTab = "profile" | "orders" | "addresses" | "logout";

interface Address {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  street: string;
  city: string;
  postal_code: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  birthday: string | null;
  avatar_url: string | null;
}

const Account = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MenuTab>("profile");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Profile states
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Address form states
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    name: "",
    street: "",
    city: "",
    postal_code: "",
    phone: "",
    is_default: false,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch user profile
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Fetch addresses and setup realtime
  useEffect(() => {
    if (user) {
      fetchAddresses();

      // Setup realtime subscription for addresses
      const channel = supabase
        .channel('user_addresses_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_addresses',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchAddresses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    if (data) {
      setProfile(data);
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
    }
  };

  const fetchAddresses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching addresses:', error);
      return;
    }

    setAddresses(data || []);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!fullName.trim()) {
      toast({ 
        title: "Error", 
        description: "Name cannot be empty",
        variant: "destructive" 
      });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      })
      .eq('id', user.id);

    setIsSaving(false);

    if (error) {
      console.error('Error updating profile:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update profile",
        variant: "destructive" 
      });
      return;
    }

    setIsEditing(false);
    toast({ title: "Profile updated successfully" });
    fetchProfile();
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logged out successfully" });
    navigate("/");
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    
    // Validate file size (5MB)
    if (file.size > 5242880) {
      toast({ 
        title: "Error", 
        description: "Ukuran file terlalu besar. Maksimal 5MB.",
        variant: "destructive" 
      });
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ 
        title: "Error", 
        description: "Format file tidak didukung. Gunakan JPEG, PNG, atau WebP.",
        variant: "destructive" 
      });
      return;
    }

    try {
      setUploadingAvatar(true);

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast({ title: "Foto profil berhasil diperbarui!" });
      await fetchProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({ 
        title: "Error", 
        description: "Gagal mengupload foto profil. Silakan coba lagi.",
        variant: "destructive" 
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting address:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete address",
        variant: "destructive" 
      });
      return;
    }

    toast({ title: "Address deleted successfully" });
  };

  const openAddressDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        name: address.name,
        street: address.street,
        city: address.city,
        postal_code: address.postal_code,
        phone: address.phone,
        is_default: address.is_default,
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        name: "",
        street: "",
        city: "",
        postal_code: "",
        phone: "",
        is_default: false,
      });
    }
    setShowAddressDialog(true);
  };

  const handleSaveAddress = async () => {
    if (!user) return;

    // Validation
    if (!addressForm.name.trim() || !addressForm.street.trim() || 
        !addressForm.city.trim() || !addressForm.postal_code.trim() || 
        !addressForm.phone.trim()) {
      toast({ 
        title: "Error", 
        description: "All fields are required",
        variant: "destructive" 
      });
      return;
    }

    setIsSaving(true);

    if (editingAddress) {
      // Update existing address
      const { error } = await supabase
        .from('user_addresses')
        .update({
          name: addressForm.name.trim(),
          street: addressForm.street.trim(),
          city: addressForm.city.trim(),
          postal_code: addressForm.postal_code.trim(),
          phone: addressForm.phone.trim(),
          is_default: addressForm.is_default,
        })
        .eq('id', editingAddress.id);

      setIsSaving(false);

      if (error) {
        console.error('Error updating address:', error);
        toast({ 
          title: "Error", 
          description: "Failed to update address",
          variant: "destructive" 
        });
        return;
      }

      toast({ title: "Address updated successfully" });
    } else {
      // Create new address
      // If this is set as default, unset other defaults first
      if (addressForm.is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: user.id,
          name: addressForm.name.trim(),
          street: addressForm.street.trim(),
          city: addressForm.city.trim(),
          postal_code: addressForm.postal_code.trim(),
          phone: addressForm.phone.trim(),
          is_default: addressForm.is_default,
        });

      setIsSaving(false);

      if (error) {
        console.error('Error creating address:', error);
        toast({ 
          title: "Error", 
          description: "Failed to create address",
          variant: "destructive" 
        });
        return;
      }

      toast({ title: "Address created successfully" });
    }

    setShowAddressDialog(false);
    setEditingAddress(null);
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

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">My Account</h1>
        <p className="text-muted-foreground text-sm mb-8">Manage your profile and orders</p>

        {/* User Info Card */}
        <div className="bg-background rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
                <AvatarFallback className="bg-foreground text-background text-2xl">
                  {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <label 
                htmlFor="avatar-upload" 
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="w-5 h-5 text-white" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <h2 className="text-lg font-bold">{profile?.full_name || user.email?.split('@')[0] || 'User'}</h2>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-1">Klik foto untuk mengubah</p>
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
                  <Input 
                    className="w-48 h-8" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                  />
                ) : (
                  <span className="font-medium">{fullName || "Not set"}</span>
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
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                ) : (
                  <span className="font-medium">{phone || "Not set"}</span>
                )}
              </div>
            </div>

            {isEditing && (
              <Button 
                className="w-full mt-6" 
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        )}

        {/* Orders View */}
        {activeTab === "orders" && (
          <div className="bg-background rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">PESANAN SAYA</h2>
            <OrdersList />
          </div>
        )}

        {/* Addresses View */}
        {activeTab === "addresses" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">SHIPPING ADDRESSES</h2>
              <Button onClick={() => openAddressDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                ADD NEW
              </Button>
            </div>

            {addresses.length === 0 ? (
              <div className="bg-background rounded-2xl p-12 text-center shadow-sm">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No addresses saved yet</p>
                <Button onClick={() => openAddressDialog()} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Address
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((address) => (
                  <div key={address.id} className="bg-background rounded-2xl p-6 shadow-sm border-2">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold">{address.name}</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAddressDialog(address)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAddress(address.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {address.is_default && (
                      <Badge className="bg-foreground text-background mb-3">DEFAULT</Badge>
                    )}
                    <p className="text-sm mb-1">{address.street}</p>
                    <p className="text-sm mb-2">{address.city} {address.postal_code}</p>
                    <p className="text-sm">{address.phone}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Address Dialog */}
            <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingAddress ? "Edit Address" : "Add New Address"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="addr-name">Recipient Name</Label>
                    <Input
                      id="addr-name"
                      value={addressForm.name}
                      onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="addr-street">Street Address</Label>
                    <Input
                      id="addr-street"
                      value={addressForm.street}
                      onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                      placeholder="e.g. Jl. Pangeran Kejaksan"
                    />
                  </div>

                  <div>
                    <Label htmlFor="addr-city">City & Province</Label>
                    <Input
                      id="addr-city"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      placeholder="e.g. Kota Cirebon, JAWA BARAT"
                    />
                  </div>

                  <div>
                    <Label htmlFor="addr-postal">Postal Code</Label>
                    <Input
                      id="addr-postal"
                      value={addressForm.postal_code}
                      onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                      placeholder="e.g. 45612"
                    />
                  </div>

                  <div>
                    <Label htmlFor="addr-phone">Phone Number</Label>
                    <Input
                      id="addr-phone"
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      placeholder="e.g. 081312367085"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="addr-default"
                      checked={addressForm.is_default}
                      onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="addr-default" className="cursor-pointer">
                      Set as default address
                    </Label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowAddressDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSaveAddress}
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Address"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
