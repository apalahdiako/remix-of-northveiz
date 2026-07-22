import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Visitor tracking hook.
 * All IP + geolocation resolution is performed server-side by the
 * `visitor-track` edge function using the real client IP. The browser
 * never sends location data, never caches it, and never inherits it
 * from other visitors.
 */
export function useVisitorTracking() {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    let sid = sessionStorage.getItem("visitor_session_id");
    if (!sid) {
      sid = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem("visitor_session_id", sid);
    }
    setSessionId(sid);

    trackVisitor(sid);

    const interval = setInterval(() => {
      touch(sid!, true);
    }, 30000);

    const onUnload = () => touch(sid!, false);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", onUnload);
      touch(sid!, false);
    };
  }, []);

  const trackVisitor = async (sid: string) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      await supabase.functions.invoke("visitor-track", {
        body: {
          session_id: sid,
          page_path: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          user_id: userRes?.user?.id ?? null,
        },
      });
    } catch (error) {
      console.error("visitor-track invoke failed:", error);
    }
  };

  const touch = async (sid: string, active: boolean) => {
    try {
      await supabase.rpc("touch_visitor_session", {
        p_sid: sid,
        p_path: window.location.pathname,
        p_active: active,
      });
    } catch (error) {
      console.error("touch_visitor_session failed:", error);
    }
  };

  return { sessionId };
}
