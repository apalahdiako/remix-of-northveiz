import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, Radio } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function BroadcastManagement() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);

  const fetchUserCount = async () => {
    try {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      setUserCount(count || 0);
    } catch (error: any) {
      console.error("Error fetching user count:", error);
      toast.error("Gagal mengambil jumlah pengguna");
    }
  };

  const handleBroadcast = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Subjek dan isi pesan wajib diisi");
      return;
    }

    try {
      setSending(true);
      console.log("Sending broadcast email...");

      const { data, error } = await supabase.functions.invoke("send-broadcast-email", {
        body: { subject, content },
      });

      if (error) throw error;

      toast.success(
        data.message || 
        `Broadcast berhasil dikirim ke ${data.successCount || 0} pengguna!`
      );
      
      // Reset form
      setSubject("");
      setContent("");
    } catch (error: any) {
      console.error("Error sending broadcast:", error);
      toast.error(error.message || "Gagal mengirim broadcast email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          Broadcast Pesan Global
        </CardTitle>
        <CardDescription>
          Kirim pesan atau informasi secara massal ke semua pengguna terdaftar melalui Gmail
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Target Penerima</p>
              <p className="text-xs text-muted-foreground mt-1">
                Semua Pengguna Terdaftar (Login/Register)
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchUserCount}
              disabled={sending}
            >
              {userCount !== null ? `${userCount} Pengguna` : "Lihat Jumlah"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subjek Email *</Label>
            <Input
              id="subject"
              placeholder="Contoh: Pembaruan Penting Komunitas"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Isi Pesan *</Label>
            <Textarea
              id="content"
              placeholder="Tulis pesan Anda di sini..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={sending}
              rows={12}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Pesan akan dikirim dalam format HTML yang terstruktur dengan header dan footer otomatis
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              className="w-full" 
              size="lg"
              disabled={!subject.trim() || !content.trim() || sending}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Broadcast Sekarang
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Pengiriman Broadcast</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin mengirim pesan ini ke{" "}
                <strong>{userCount !== null ? userCount : "semua"} pengguna terdaftar</strong>?
                <br />
                <br />
                Email akan dikirim ke akun Gmail masing-masing pengguna. Proses ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleBroadcast}>
                Ya, Kirim Sekarang
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Catatan:</strong> Pengiriman email menggunakan sistem antrean (queue) 
            untuk memastikan pengiriman yang andal. Pengguna akan menerima email dalam 
            beberapa menit setelah broadcast dijalankan.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
