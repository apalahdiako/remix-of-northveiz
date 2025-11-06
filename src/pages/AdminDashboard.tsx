import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, Globe as GlobeIcon, MailIcon, ShoppingBag, Inbox } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InteractiveGlobe from "@/components/admin/InteractiveGlobe";
import AnalyticsCards from "@/components/admin/AnalyticsCards";
import { TimerManagement } from "@/components/admin/TimerManagement";
import ProductManagement from "@/components/admin/ProductManagement";
import ProductImageManagement from "@/components/admin/ProductImageManagement";
import { OrderManagement } from "@/components/admin/OrderManagement";
import { InboxManagement } from "@/components/admin/InboxManagement";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("Terima Kasih Telah Bergabung dengan NORTHVEIZ");
  const [emailContent, setEmailContent] = useState(`Terima kasih telah mengunjungi NORTHVEIZ! Kami sangat senang bisa memperkenalkan produk dan layanan kami kepada Anda. Kehadiran Anda sangat berarti bagi kami.

Jika Anda memiliki pertanyaan atau membutuhkan informasi lebih lanjut mengenai produk atau layanan kami, jangan ragu untuk menghubungi kami. Kami juga mengundang Anda untuk mengikuti kami di media sosial untuk mendapatkan update terbaru dan penawaran spesial!

Sekali lagi, terima kasih atas dukungan Anda, dan kami berharap dapat melayani Anda lebih baik lagi di masa mendatang.

Salam hangat,
Tim NORTHVEIZ`);
  
  // Analytics state
  const [locations, setLocations] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState({
    totalVisitors: 0,
    activeVisitors: 0,
    totalOrders: 0,
    totalRevenue: 0,
    topCountries: [] as Array<{ country: string; count: number }>,
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Akses ditolak: Anda bukan admin");
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchAnalytics();
      
      // Set up realtime subscription for visitor sessions
      const channel = supabase
        .channel('visitor-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'visitor_sessions'
          },
          () => {
            fetchAnalytics();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get auth users to get emails - note: this requires service role access
      // For now, we'll just show profiles without emails from auth
      // In production, this would need to be done via an edge function with service role

      // Map profiles to user list (email will be fetched server-side when sending)
      const userList: UserProfile[] = profiles?.map((profile) => ({
        id: profile.id,
        full_name: profile.full_name,
        email: "Email akan ditampilkan saat pengiriman",
        created_at: profile.created_at,
      })) || [];

      setUsers(userList);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Gagal memuat daftar pengguna");
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Fetch active visitors by location
      const { data: visitorData, error: visitorError } = await supabase
        .from("visitor_sessions")
        .select("*")
        .eq("is_active", true);

      if (visitorError) throw visitorError;

      // Fetch all visitor sessions for total count
      const { count: totalCount } = await supabase
        .from("visitor_sessions")
        .select("*", { count: "exact", head: true });

      // Fetch orders with location data
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*");

      if (ordersError) throw ordersError;

      // Group data by country
      const locationMap = new Map();
      
      // Add visitor data
      visitorData?.forEach((session) => {
        if (!session.country_code || !session.latitude || !session.longitude) return;
        
        const key = session.country_code;
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            country_code: session.country_code,
            country_name: session.country_name,
            latitude: session.latitude,
            longitude: session.longitude,
            visitor_count: 0,
            order_count: 0,
            total_sales: 0,
          });
        }
        
        const loc = locationMap.get(key);
        loc.visitor_count += 1;
      });

      // Add order data
      let totalRevenue = 0;
      ordersData?.forEach((order) => {
        const amount = parseFloat(String(order.total_amount || "0"));
        totalRevenue += amount;
        
        if (order.country_code && locationMap.has(order.country_code)) {
          const loc = locationMap.get(order.country_code);
          loc.order_count += 1;
          loc.total_sales += amount;
        }
      });

      const locationsArray = Array.from(locationMap.values());
      setLocations(locationsArray);

      // Calculate top countries
      const topCountries = locationsArray
        .sort((a, b) => (b.visitor_count + b.order_count) - (a.visitor_count + a.order_count))
        .slice(0, 5)
        .map((loc) => ({
          country: loc.country_name,
          count: loc.visitor_count + loc.order_count,
        }));

      setAnalyticsData({
        totalVisitors: totalCount || 0,
        activeVisitors: visitorData?.length || 0,
        totalOrders: ordersData?.length || 0,
        totalRevenue,
        topCountries,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Gagal memuat data analytics");
    }
  };

  const sendEmails = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Pilih minimal satu pengguna");
      return;
    }

    if (!subject.trim() || !emailContent.trim()) {
      toast.error("Subjek dan isi email tidak boleh kosong");
      return;
    }

    try {
      setSending(true);

      const { data, error } = await supabase.functions.invoke("send-welcome-email", {
        body: {
          userIds: selectedUsers,
          subject: subject,
          content: emailContent,
        },
      });

      if (error) throw error;

      toast.success(`Email berhasil dikirim ke ${data.sent} pengguna`);
      setSelectedUsers([]);
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast.error("Gagal mengirim email: " + error.message);
    } finally {
      setSending(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Button>

      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <Tabs defaultValue="globe" className="space-y-6">
        <TabsList>
          <TabsTrigger value="globe">
            <GlobeIcon className="mr-2 h-4 w-4" />
            Peta Global
          </TabsTrigger>
          <TabsTrigger value="inbox">
            <Inbox className="mr-2 h-4 w-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="timer">
            Timer Global
          </TabsTrigger>
          <TabsTrigger value="products">
            Produk
          </TabsTrigger>
          <TabsTrigger value="images">
            Gambar Produk
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Pesanan
          </TabsTrigger>
          <TabsTrigger value="email">
            <MailIcon className="mr-2 h-4 w-4" />
            Kirim Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="globe" className="space-y-6">
          <AnalyticsCards data={analyticsData} />
          
          <Card>
            <CardHeader>
              <CardTitle>Peta Interaktif Pengunjung & Pesanan</CardTitle>
              <CardDescription>
                Putar peta untuk melihat lokasi pengunjung dan pesanan dari berbagai negara
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InteractiveGlobe locations={locations} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbox">
          <InboxManagement />
        </TabsContent>

        <TabsContent value="timer">
          <TimerManagement />
        </TabsContent>

        <TabsContent value="products">
          <ProductManagement />
        </TabsContent>

        <TabsContent value="images">
          <ProductImageManagement />
        </TabsContent>

        <TabsContent value="orders">
          <OrderManagement />
        </TabsContent>

        <TabsContent value="email">
          <div className="grid gap-6 md:grid-cols-2">
        {/* User Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Pilih Pengguna</CardTitle>
            <CardDescription>
              Pilih pengguna yang akan menerima email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-4 border-b">
                <Checkbox
                  id="select-all"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onCheckedChange={toggleAll}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Pilih Semua ({users.length} pengguna)
                </label>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md"
                  >
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <label
                      htmlFor={user.id}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      <div className="font-medium">
                        {user.full_name || "No Name"}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {user.email}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {selectedUsers.length > 0 && (
                <div className="pt-4 border-t text-sm text-muted-foreground">
                  {selectedUsers.length} pengguna dipilih
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Isi Email</CardTitle>
            <CardDescription>
              Sesuaikan subjek dan isi email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subjek Email</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subjek email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Isi Email</Label>
                <Textarea
                  id="content"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Tulis isi email..."
                  className="min-h-[300px]"
                />
              </div>

              <Button
                onClick={sendEmails}
                disabled={sending || selectedUsers.length === 0}
                className="w-full"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Kirim Email ({selectedUsers.length} pengguna)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
