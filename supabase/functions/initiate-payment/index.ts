import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const rawKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    if (!rawKey) throw new Error("MIDTRANS_SERVER_KEY not configured");

    const MIDTRANS_SERVER_KEY = rawKey.trim();
    const isSandbox = MIDTRANS_SERVER_KEY.startsWith("SB-");

    // Snap API endpoint (NOT Core API /v2/charge)
    const snapUrl = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
      : "https://app.midtrans.com/snap/v1/transactions";

    const authToken = btoa(MIDTRANS_SERVER_KEY + ":");

    console.log("=== MIDTRANS SNAP INITIATE ===");
    console.log("Environment:", isSandbox ? "SANDBOX" : "PRODUCTION");
    console.log("Snap URL:", snapUrl);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { orderId } = await req.json();
    if (!orderId) throw new Error("orderId is required");

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw new Error("Order not found");

    // Ensure unique order_id for Midtrans (append timestamp)
    const uniqueOrderId = `${order.order_number}-${Date.now()}`;

    // Ensure gross_amount is integer (Midtrans requirement)
    const grossAmount = Math.floor(Number(order.total_amount));
    if (isNaN(grossAmount) || grossAmount <= 0) {
      throw new Error(`Invalid gross_amount: ${order.total_amount}`);
    }

    // Minimum amount validation for retail channels
    if (grossAmount < 10000) {
      throw new Error("Minimal transaksi Rp10.000 untuk semua metode pembayaran");
    }

    // Build Snap transaction parameter
    // NO enabled_payments — let Midtrans show all active methods from Dashboard
    const snapPayload: any = {
      transaction_details: {
        order_id: uniqueOrderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        shipping_address: {
          first_name: order.customer_name,
          phone: order.customer_phone,
          address: order.shipping_address,
          city: order.city,
          postal_code: order.postal_code,
          country_code: "IDN",
        },
      },
      item_details: [
        {
          id: order.product_id,
          name: order.product_name.substring(0, 50),
          price: Math.floor(grossAmount / order.quantity),
          quantity: order.quantity,
        },
      ],
      // Enable 3DS for Visa/Mastercard international cards
      credit_card: {
        secure: true,
      },
    };

    console.log("Snap payload:", JSON.stringify(snapPayload));

    const midtransResponse = await fetch(snapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${authToken}`,
      },
      body: JSON.stringify(snapPayload),
    });

    const midtransData = await midtransResponse.json();

    if (!midtransResponse.ok || midtransData.error_messages) {
      console.error("Midtrans Snap error:", JSON.stringify(midtransData));
      throw new Error(
        `Midtrans error: ${midtransData.error_messages?.join(", ") || midtransData.status_message || JSON.stringify(midtransData)}`
      );
    }

    console.log("Snap token created:", midtransData.token ? "OK" : "MISSING");
    console.log("Snap redirect URL:", midtransData.redirect_url ? "OK" : "MISSING");

    // Store snap_token in order for reference
    await supabase
      .from("orders")
      .update({
        snap_token: midtransData.token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        snap_token: midtransData.token,
        redirect_url: midtransData.redirect_url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error creating Snap transaction:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
