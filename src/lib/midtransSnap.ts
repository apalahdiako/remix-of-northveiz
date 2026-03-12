// Dynamically loads the Midtrans Snap.js script
// Client key is a publishable key, safe for frontend

const MIDTRANS_CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || "";

// Detect sandbox vs production based on key prefix
const isSandbox = !MIDTRANS_CLIENT_KEY || MIDTRANS_CLIENT_KEY.startsWith("SB-");

const SNAP_URL = isSandbox
  ? "https://app.sandbox.midtrans.com/snap/snap.js"
  : "https://app.midtrans.com/snap/snap.js";

let loaded = false;

export function loadSnapJs(): Promise<void> {
  if (loaded || typeof window === "undefined") return Promise.resolve();

  // Check if already loaded
  if (window.snap) {
    loaded = true;
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SNAP_URL;
    script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
      loaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Midtrans Snap.js"));
    document.head.appendChild(script);
  });
}
