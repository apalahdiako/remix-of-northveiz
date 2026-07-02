import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveStream {
  id: string;
  admin_id: string;
  title: string;
  cover_url: string | null;
  status: string;
  viewer_count: number;
  like_count: number;
  started_at: string;
  ended_at: string | null;
}

/** Subscribes to the currently active live stream (if any). */
export function useActiveLiveStream() {
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchLatest = async () => {
      const { data } = await supabase
        .from("live_streams")
        .select("*")
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (mounted) {
        setStream((data as LiveStream) ?? null);
        setLoading(false);
      }
    };

    fetchLatest();

    const channel = supabase
      .channel("live_streams_watcher")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_streams" },
        () => fetchLatest()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { stream, loading };
}
