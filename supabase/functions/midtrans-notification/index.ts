import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY");
    if (!MIDTRANS_SERVER_KEY) throw new Error("MIDTRANS_SERVER_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const notification = await req.json();
    console.log("Midtrans notification received:", JSON.stringify(notification));

    const { order_id, transaction_status, fraud_status, status_code, signature_key, gross_amount } = notification;

    // Verify signature: SHA512(order_id + status_code + gross_amount + server_key)
    const rawSignature = order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-512", encoder.encode(rawSignature));
    const hashArray = new Uint8Array(hashBuffer);
    const expectedSignature = Array.from(hashArray).map(b => b.toString(16).padStart(2, "0")).join("");

    if (signature_key !== expectedSignature) {
      console.error("Invalid signature!", { expected: expectedSignature, received: signature_key });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map Midtrans status to our order status
    let orderStatus: string;
    let paymentStatus: string;
    let paidAt: string | null = null;

    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept" || !fraud_status) {
        orderStatus = "paid";
        paymentStatus = "paid";
        paidAt = new Date().toISOString();
      } else {
        orderStatus = "pending";
        paymentStatus = "pending";
      }
    } else if (transaction_status === "pending") {
      orderStatus = "pending";
      paymentStatus = "pending";
    } else if (["deny", "cancel", "expire"].includes(transaction_status)) {
      orderStatus = "cancelled";
      paymentStatus = transaction_status === "expire" ? "expired" : "cancelled";
    } else if (transaction_status === "refund" || transaction_status === "partial_refund") {
      orderStatus = "return_requested";
      paymentStatus = "refunded";
    } else {
      orderStatus = "pending";
      paymentStatus = "pending";
    }

    // Extract original order_number from unique order_id (format: ORD-xxx-timestamp)
    // Strip the last -timestamp suffix to get back ORD-xxx
    const orderNumber = order_id.replace(/-\d+$/, '');

    // Update order by order_number
    const updateData: any = {
      order_status: orderStatus,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    };
    if (paidAt) updateData.paid_at = paidAt;
    if (orderStatus === "cancelled") updateData.cancelled_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("order_number", orderNumber);

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw updateError;
    }

    console.log(`Order ${order_id} updated to status: ${orderStatus}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error processing Midtrans notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
