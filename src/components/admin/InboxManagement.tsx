import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Trash2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  send_status: string;
  error: string | null;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  general: "General Inquiry",
  "kritik-saran": "Kritik & Saran",
  business: "Business/Partnership",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  received: { label: "Diterima", variant: "outline" },
  notified: { label: "Email Terkirim", variant: "default" },
  fallback_notified: { label: "Tersimpan (Email Gagal)", variant: "secondary" },
  failed: { label: "Gagal", variant: "destructive" },
};

export function InboxManagement() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel('contact-messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_messages'
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Gagal memuat pesan');
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      setDeleting(id);
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Pesan berhasil dihapus');
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast.error('Gagal menghapus pesan');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Inbox Pesan Kontak
        </CardTitle>
        <CardDescription>
          Semua pesan dari formulir kontak akan tersimpan di sini
        </CardDescription>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Belum ada pesan masuk</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <Card key={msg.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{msg.name}</CardTitle>
                        <Badge variant={statusLabels[msg.send_status]?.variant || "outline"}>
                          {statusLabels[msg.send_status]?.label || msg.send_status}
                        </Badge>
                        <Badge variant="outline">
                          {categoryLabels[msg.category] || msg.category}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <a 
                          href={`mailto:${msg.email}`}
                          className="hover:underline inline-flex items-center gap-1"
                        >
                          {msg.email}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <span>•</span>
                        <span>{new Date(msg.created_at).toLocaleString('id-ID')}</span>
                      </CardDescription>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={deleting === msg.id}
                        >
                          {deleting === msg.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Pesan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Pesan dari {msg.name} akan dihapus secara permanen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMessage(msg.id)}>
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md">
                    <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                  </div>
                  {msg.error && (
                    <div className="mt-2 text-xs text-destructive">
                      Error: {msg.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}