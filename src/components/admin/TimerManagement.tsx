import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TimerSettings {
  id: string;
  title: string;
  timer_type: string;
  target_date: string;
  is_active: boolean;
  action_link: string;
}

export function TimerManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TimerSettings>({
    id: "",
    title: "Flash Sale Berakhir Dalam",
    timer_type: "countdown",
    target_date: "",
    is_active: false,
    action_link: "/catalog",
  });

  useEffect(() => {
    fetchTimerSettings();
  }, []);

  const fetchTimerSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("global_timer")
        .select("*")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          title: data.title,
          timer_type: data.timer_type || "countdown",
          target_date: data.target_date ? new Date(data.target_date).toISOString().slice(0, 16) : "",
          is_active: data.is_active,
          action_link: data.action_link || "/catalog",
        });
      }
    } catch (error) {
      console.error("Error fetching timer settings:", error);
      toast.error("Gagal memuat pengaturan timer");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!settings.title) {
        toast.error("Judul harus diisi");
        return;
      }

      if (settings.timer_type === "countdown" && !settings.target_date) {
        toast.error("Tanggal target harus diisi untuk countdown");
        return;
      }

      const updateData = {
        title: settings.title,
        timer_type: settings.timer_type,
        target_date: settings.target_date ? new Date(settings.target_date).toISOString() : null,
        is_active: settings.is_active,
        action_link: settings.action_link,
      };

      if (settings.id) {
        // Update existing timer
        const { error } = await supabase
          .from("global_timer")
          .update(updateData)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Create new timer
        const { data, error } = await supabase
          .from("global_timer")
          .insert([updateData])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSettings((prev) => ({ ...prev, id: data.id }));
        }
      }

      toast.success("Pengaturan timer berhasil disimpan!");
    } catch (error) {
      console.error("Error saving timer:", error);
      toast.error("Gagal menyimpan pengaturan timer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Timer Global</CardTitle>
        <CardDescription>
          Atur timer hitung mundur yang akan ditampilkan di halaman utama untuk semua pengunjung
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Judul Timer</Label>
          <Input
            id="title"
            value={settings.title}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Flash Sale Berakhir Dalam"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timer_type">Tipe Timer</Label>
          <Select
            value={settings.timer_type}
            onValueChange={(value) =>
              setSettings((prev) => ({ ...prev, timer_type: value }))
            }
          >
            <SelectTrigger id="timer_type">
              <SelectValue placeholder="Pilih tipe timer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="countdown">Hitung Mundur (Countdown)</SelectItem>
              <SelectItem value="current_time">Waktu Saat Ini</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Pilih apakah timer menghitung mundur atau menampilkan waktu saat ini
          </p>
        </div>

        {settings.timer_type === "countdown" && (
          <div className="space-y-2">
            <Label htmlFor="target_date">Tanggal & Waktu Target</Label>
            <Input
              id="target_date"
              type="datetime-local"
              value={settings.target_date}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, target_date: e.target.value }))
              }
            />
            <p className="text-sm text-muted-foreground">
              Pilih tanggal dan waktu berakhirnya timer
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="action_link">Link Tombol "View More"</Label>
          <Input
            id="action_link"
            value={settings.action_link}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, action_link: e.target.value }))
            }
            placeholder="/catalog"
          />
          <p className="text-sm text-muted-foreground">
            Halaman tujuan saat tombol "View More" diklik
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="is_active">Aktifkan Timer</Label>
            <p className="text-sm text-muted-foreground">
              Tampilkan timer di halaman utama
            </p>
          </div>
          <Switch
            id="is_active"
            checked={settings.is_active}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, is_active: checked }))
            }
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            "Simpan Pengaturan"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
