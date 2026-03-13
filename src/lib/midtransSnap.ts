// Dynamically loads the Midtrans Snap.js script — PRODUCTION ONLY
// No sandbox detection. Always production endpoint.

import { supabase } from "@/integrations/supabase/client";

const SNAP_URL = "https://app.midtrans.com/snap/snap.js";

let loaded = false;
let clientKeyCache: string | null = null;

async function fetchClientKey(): Promise<string> {
  if (clientKeyCache) return clientKeyCache;

  const { data, error } = await supabase.functions.invoke("get-snap-config");
  if (error) {
    console.error("Failed to fetch Midtrans client key:", error);
    return "";
  }
  clientKeyCache = data?.client_key || "";
  return clientKeyCache;
}

export async function loadSnapJs(): Promise<void> {
  if (loaded || typeof window === "undefined") return;

  // Check if already loaded
  if (window.snap) {
    loaded = true;
    return;
  }

  const clientKey = await fetchClientKey();
  if (!clientKey) {
    console.error("MIDTRANS_CLIENT_KEY is empty — Snap.js will not work correctly");
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SNAP_URL;
    script.setAttribute("data-client-key", clientKey);
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
      loaded = true;
      console.log("Snap.js PRODUCTION loaded successfully");
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Midtrans Snap.js"));
    document.head.appendChild(script);
  });
}
