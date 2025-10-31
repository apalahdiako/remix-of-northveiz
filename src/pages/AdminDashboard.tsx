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
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Akses ditolak: Anda bukan admin");
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Button>

      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

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
    </div>
  );
}
