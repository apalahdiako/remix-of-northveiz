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
import { Loader2, Mail, ArrowLeft, MailIcon, ShoppingBag, Inbox, Radio, Phone, BarChart3, Users, Tag, Truck, FileText, Settings, Home } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import OverviewEnhancements from "@/components/admin/OverviewEnhancements";
import { TimerManagement } from "@/components/admin/TimerManagement";
import ProductManagement from "@/components/admin/ProductManagement";
import ProductImageManagement from "@/components/admin/ProductImageManagement";
import EnhancedOrderManagement from "@/components/admin/EnhancedOrderManagement";
import { InboxManagement } from "@/components/admin/InboxManagement";
import { CommunityManagement } from "@/components/admin/CommunityManagement";
import { BroadcastManagement } from "@/components/admin/BroadcastManagement";
import AdminChatDashboard from "@/components/admin/AdminChatDashboard";
import CallHistory, { useMissedCallCount } from "@/components/admin/CallHistory";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminCustomerManagement from "@/components/admin/AdminCustomerManagement";
import AdminMarketing from "@/components/admin/AdminMarketing";
import AdminShipping from "@/components/admin/AdminShipping";
import AdminContent from "@/components/admin/AdminContent";
import AdminSettings from "@/components/admin/AdminSettings";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const missedCallCount = useMissedCallCount();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [callActiveSession, setCallActiveSession] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [subject, setSubject] = useState("Terima Kasih Telah Bergabung dengan NORTHVEIZ");
  const [emailContent, setEmailContent] = useState(`Terima kasih telah mengunjungi NORTHVEIZ! Kami sangat senang bisa memperkenalkan produk dan layanan kami kepada Anda. Kehadiran Anda sangat berarti bagi kami.

Jika Anda memiliki pertanyaan atau membutuhkan informasi lebih lanjut mengenai produk atau layanan kami, jangan ragu untuk menghubungi kami. Kami juga mengundang Anda untuk mengikuti kami di media sosial untuk mendapatkan update terbaru dan penawaran spesial!

Sekali lagi, terima kasih atas dukungan Anda, dan kami berharap dapat melayani Anda lebih baik lagi di masa mendatang.

Salam hangat,
Tim NORTHVEIZ`);
  
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
      
      const visitorChannel = supabase
        .channel('visitor-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_sessions' }, () => fetchAnalytics())
        .subscribe();

      const ordersChannel = supabase
        .channel('orders-changes-analytics')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAnalytics())
        .subscribe();

      return () => {
        supabase.removeChannel(visitorChannel);
        supabase.removeChannel(ordersChannel);
      };
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

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
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAll = () => {
    if (selectedUsers.length === users.length) setSelectedUsers([]);
    else setSelectedUsers(users.map((u) => u.id));
  };

  const fetchAnalytics = async () => {
    try {
      const { data: visitorData, error: visitorError } = await supabase
        .from("visitor_sessions")
        .select("country_code, country_name, city, latitude, longitude, is_active");
      if (visitorError) throw visitorError;

      const totalCount = visitorData?.length || 0;
      const activeCount = visitorData?.filter((v) => v.is_active).length || 0;

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("total_amount, country_code, city, latitude, longitude, payment_status");
      if (ordersError) throw ordersError;

      const locationMap = new Map<string, any>();

      visitorData?.forEach((session) => {
        if (session.latitude == null || session.longitude == null) return;
        const key = session.country_code || session.city || `${session.latitude},${session.longitude}`;
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            country_code: session.country_code || "XX",
            country_name: session.country_name || session.city || "Unknown",
            latitude: Number(session.latitude),
            longitude: Number(session.longitude),
            visitor_count: 0, order_count: 0, total_sales: 0,
          });
        }
        locationMap.get(key).visitor_count += 1;
      });

      let totalRevenue = 0;
      let totalOrders = 0;
      ordersData?.forEach((order: any) => {
        const amount = Number(order.total_amount) || 0;
        totalRevenue += amount;
        totalOrders += 1;

        if (order.latitude != null && order.longitude != null) {
          const key = order.country_code || order.city || `${order.latitude},${order.longitude}`;
          if (!locationMap.has(key)) {
            locationMap.set(key, {
              country_code: order.country_code || "XX",
              country_name: order.city || "Unknown",
              latitude: Number(order.latitude),
              longitude: Number(order.longitude),
              visitor_count: 0, order_count: 0, total_sales: 0,
            });
          }
          const loc = locationMap.get(key);
          loc.order_count += 1;
          loc.total_sales += amount;
        }
      });

      const locationsArray = Array.from(locationMap.values());
      setLocations(locationsArray);

      const topCountries = locationsArray
        .sort((a, b) => (b.visitor_count + b.order_count) - (a.visitor_count + a.order_count))
        .slice(0, 5)
        .map((loc) => ({ country: loc.country_name, count: loc.visitor_count + loc.order_count }));

      setAnalyticsData({ totalVisitors: totalCount, activeVisitors: activeCount, totalOrders, totalRevenue, topCountries });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const sendEmails = async () => {
    if (selectedUsers.length === 0) { toast.error("Pilih minimal satu pengguna"); return; }
    if (!subject.trim() || !emailContent.trim()) { toast.error("Subjek dan isi email tidak boleh kosong"); return; }
    try {
      setSending(true);
      const { data, error } = await supabase.functions.invoke("send-welcome-email", {
        body: { userIds: selectedUsers, subject, content: emailContent },
      });
      if (error) throw error;
      toast.success(`Email berhasil dikirim ke ${data.sent} pengguna`);
      setSelectedUsers([]);
    } catch (error: any) {
      toast.error("Gagal mengirim email: " + error.message);
    } finally {
      setSending(false);
    }
  };

  if (adminLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen pt-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
      <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />Kembali
      </Button>

      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-max">
            <TabsTrigger value="overview"><Home className="mr-1.5 h-3.5 w-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingBag className="mr-1.5 h-3.5 w-3.5" />Pesanan</TabsTrigger>
            <TabsTrigger value="products">Produk</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="mr-1.5 h-3.5 w-3.5" />Analytics</TabsTrigger>
            <TabsTrigger value="customers"><Users className="mr-1.5 h-3.5 w-3.5" />Customer</TabsTrigger>
            <TabsTrigger value="chat">💬 Live Chat</TabsTrigger>
            <TabsTrigger value="calls" className="relative">
              <Phone className="mr-1.5 h-3.5 w-3.5" />Panggilan
              {missedCallCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">{missedCallCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="marketing"><Tag className="mr-1.5 h-3.5 w-3.5" />Promo</TabsTrigger>
            <TabsTrigger value="shipping"><Truck className="mr-1.5 h-3.5 w-3.5" />Shipping</TabsTrigger>
            <TabsTrigger value="content"><FileText className="mr-1.5 h-3.5 w-3.5" />Konten</TabsTrigger>
            <TabsTrigger value="inbox"><Inbox className="mr-1.5 h-3.5 w-3.5" />Inbox</TabsTrigger>
            <TabsTrigger value="community">Komunitas</TabsTrigger>
            <TabsTrigger value="broadcast"><Radio className="mr-1.5 h-3.5 w-3.5" />Broadcast</TabsTrigger>
            <TabsTrigger value="timer">Timer</TabsTrigger>
            <TabsTrigger value="images">Gambar</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="mr-1.5 h-3.5 w-3.5" />Settings</TabsTrigger>
            <TabsTrigger value="email"><MailIcon className="mr-1.5 h-3.5 w-3.5" />Email</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <OverviewEnhancements isDark={false} onNavigateToOrders={() => setActiveTab("orders")} />
          <AnalyticsDashboard analyticsData={analyticsData} locations={locations} />
        </TabsContent>

        <TabsContent value="orders">
          <EnhancedOrderManagement />
        </TabsContent>

        <TabsContent value="products">
          <ProductManagement />
          <div className="mt-6">
            <ProductImageManagement />
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <AdminAnalytics />
        </TabsContent>

        <TabsContent value="customers">
          <AdminCustomerManagement />
        </TabsContent>

        <TabsContent value="chat">
          <AdminChatDashboard />
        </TabsContent>

        <TabsContent value="calls">
          <CallHistory onCallBack={(sid) => setCallActiveSession(sid)} activeCallSessionId={callActiveSession} />
        </TabsContent>

        <TabsContent value="marketing">
          <AdminMarketing />
        </TabsContent>

        <TabsContent value="shipping">
          <AdminShipping />
        </TabsContent>

        <TabsContent value="content">
          <AdminContent />
        </TabsContent>

        <TabsContent value="inbox">
          <InboxManagement />
        </TabsContent>

        <TabsContent value="community">
          <CommunityManagement />
        </TabsContent>

        <TabsContent value="broadcast">
          <BroadcastManagement />
        </TabsContent>

        <TabsContent value="timer">
          <TimerManagement />
        </TabsContent>

        <TabsContent value="images">
          <ProductImageManagement />
        </TabsContent>

        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>

        <TabsContent value="email">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pilih Pengguna</CardTitle>
                <CardDescription>Pilih pengguna yang akan menerima email</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-4 border-b">
                    <Checkbox id="select-all" checked={selectedUsers.length === users.length && users.length > 0} onCheckedChange={toggleAll} />
                    <label htmlFor="select-all" className="text-sm font-medium">Pilih Semua ({users.length} pengguna)</label>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                        <Checkbox id={user.id} checked={selectedUsers.includes(user.id)} onCheckedChange={() => toggleUser(user.id)} />
                        <label htmlFor={user.id} className="flex-1 text-sm cursor-pointer">
                          <div className="font-medium">{user.full_name || "No Name"}</div>
                          <div className="text-muted-foreground text-xs">{user.email}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedUsers.length > 0 && (
                    <div className="pt-4 border-t text-sm text-muted-foreground">{selectedUsers.length} pengguna dipilih</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Isi Email</CardTitle>
                <CardDescription>Sesuaikan subjek dan isi email</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subjek Email</Label>
                    <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subjek email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Isi Email</Label>
                    <Textarea id="content" value={emailContent} onChange={(e) => setEmailContent(e.target.value)} placeholder="Tulis isi email..." className="min-h-[300px]" />
                  </div>
                  <Button onClick={sendEmails} disabled={sending || selectedUsers.length === 0} className="w-full">
                    {sending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</>) : (<><Mail className="mr-2 h-4 w-4" />Kirim Email ({selectedUsers.length} pengguna)</>)}
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
