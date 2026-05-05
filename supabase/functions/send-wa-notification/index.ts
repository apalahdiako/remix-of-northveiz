import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_WA_NUMBER = Deno.env.get("TWILIO_WA_NUMBER")!;

const statusMessages: Record<string, string> = {
  paid: "Pembayaran Anda telah dikonfirmasi ✅",
  processing: "Pesanan Anda sedang diproses 📦",
  packed: "Pesanan Anda sudah dikemas dan siap dikirim 📦✨",
  shipped: "Pesanan Anda sedang dalam perjalanan 🚚",
  delivered: "Pesanan Anda telah sampai! Silakan konfirmasi penerimaan ✅",
  completed: "Terima kasih! Pesanan selesai 🎉",
  cancelled: "Pesanan Anda telah dibatalkan ❌",
  return_requested: "Permintaan retur Anda sedang diproses 🔄",
  returned: "Retur Anda telah disetujui dan diproses ✅",
};

async function sendTwilioWhatsApp(to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  
  // Normalize phone number to E.164
  let phone = to.replace(/[^0-9+]/g, "");
  if (phone.startsWith("08")) {
    phone = "+62" + phone.slice(1);
  } else if (phone.startsWith("62")) {
    phone = "+" + phone;
  } else if (!phone.startsWith("+")) {
    phone = "+62" + phone;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: TWILIO_WA_NUMBER,
      To: `whatsapp:${phone}`,
      Body: body,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Twilio error:", JSON.stringify(data));
    throw new Error(`Twilio API error [${response.status}]: ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id, new_status, tracking_number } = await req.json();

    if (!order_id || !new_status) {
      return new Response(
        JSON.stringify({ error: "order_id and new_status are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("order_number, customer_name, customer_phone, product_name, total_amount")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found", details: orderError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order.customer_phone) {
      return new Response(
        JSON.stringify({ error: "Customer phone not available", sent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusMsg = statusMessages[new_status] || `Status pesanan diperbarui: ${new_status}`;
    
    const totalFormatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(order.total_amount);

    let message = `Halo ${order.customer_name} 👋\n\n`;
    message += `📋 *Pesanan #${order.order_number}*\n`;
    message += `🛍️ ${order.product_name}\n`;
    message += `💰 ${totalFormatted}\n\n`;
    message += `${statusMsg}`;

    if (new_status === "shipped" && tracking_number) {
      message += `\n\n📦 No. Resi: *${tracking_number}*`;
    }

    message += `\n\n— NORTHVEIZ`;

    const result = await sendTwilioWhatsApp(order.customer_phone, message);

    return new Response(
      JSON.stringify({ success: true, message_sid: result.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("WA notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
