import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useVisitorTracking() {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    // Generate or retrieve session ID
    let sid = sessionStorage.getItem("visitor_session_id");
    if (!sid) {
      sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("visitor_session_id", sid);
    }
    setSessionId(sid);

    // Track visitor session
    trackVisitor(sid);

    // Update activity periodically
    const interval = setInterval(() => {
      updateActivity(sid);
    }, 30000); // Update every 30 seconds

    // Mark session as inactive on unmount
    return () => {
      clearInterval(interval);
      markInactive(sid);
    };
  }, []);

  const trackVisitor = async (sid: string) => {
    try {
      // Get approximate location using ipapi
      const locationResponse = await fetch("https://ipapi.co/json/");
      const locationData = await locationResponse.json();

      await supabase.from("visitor_sessions").upsert({
        session_id: sid,
        ip_address: locationData.ip,
        country_code: locationData.country_code,
        country_name: locationData.country_name,
        city: locationData.city,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        user_agent: navigator.userAgent,
        page_path: window.location.pathname,
        referrer: document.referrer,
        is_active: true,
        last_activity_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error tracking visitor:", error);
    }
  };

  const updateActivity = async (sid: string) => {
    try {
      await supabase
        .from("visitor_sessions")
        .update({
          last_activity_at: new Date().toISOString(),
          page_path: window.location.pathname,
        })
        .eq("session_id", sid);
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  };

  const markInactive = async (sid: string) => {
    try {
      await supabase
        .from("visitor_sessions")
        .update({ is_active: false })
        .eq("session_id", sid);
    } catch (error) {
      console.error("Error marking inactive:", error);
    }
  };

  return { sessionId };
}
