import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateDigest(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64Encode(new Uint8Array(hash));
}

async function generateSignature(
  clientId: string,
  requestId: string,
  requestTimestamp: string,
  requestTarget: string,
  digest: string,
  secretKey: string
): Promise<string> {
  const componentSignature =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${requestTimestamp}\n` +
    `Request-Target:${requestTarget}\n` +
    `Digest:${digest}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(componentSignature));
  return `HMACSHA256=${base64Encode(new Uint8Array(signature))}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DOKU_CLIENT_ID = Deno.env.get("DOKU_CLIENT_ID");
    if (!DOKU_CLIENT_ID) throw new Error("DOKU_CLIENT_ID is not configured");

    const DOKU_SECRET_KEY = Deno.env.get("DOKU_SECRET_KEY");
    if (!DOKU_SECRET_KEY) throw new Error("DOKU_SECRET_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { orderId } = await req.json();
    if (!orderId) throw new Error("orderId is required");

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw new Error("Order not found");

    // Build DOKU Checkout request
    const requestId = crypto.randomUUID();
    const requestTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const requestTarget = "/checkout/v1/payment";
    const dokuBaseUrl = "https://api-sandbox.doku.com";

    const bodyPayload = {
      order: {
        amount: order.total_amount,
        invoice_number: order.order_number,
        currency: "IDR",
        callback_url: `${req.headers.get("origin") || "https://northveiz-web-fashion.lovable.app"}/payment?orderId=${orderId}&orderNumber=${order.order_number}`,
        line_items: [
          {
            name: order.product_name,
            price: order.total_amount,
            quantity: order.quantity,
          },
        ],
      },
      payment: {
        payment_due_date: 60, // 60 minutes
      },
      customer: {
        id: order.user_id || orderId,
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        address: order.shipping_address,
        country: "ID",
      },
    };

    const bodyString = JSON.stringify(bodyPayload);
    const digest = await generateDigest(bodyString);
    const signature = await generateSignature(
      DOKU_CLIENT_ID,
      requestId,
      requestTimestamp,
      requestTarget,
      digest,
      DOKU_SECRET_KEY
    );

    console.log("Calling DOKU Checkout API...", { requestId, orderNumber: order.order_number });

    const dokuResponse = await fetch(`${dokuBaseUrl}${requestTarget}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Id": DOKU_CLIENT_ID,
        "Request-Id": requestId,
        "Request-Timestamp": requestTimestamp,
        Signature: signature,
      },
      body: bodyString,
    });

    const dokuData = await dokuResponse.json();

    if (!dokuResponse.ok) {
      console.error("DOKU API error:", JSON.stringify(dokuData));
      throw new Error(`DOKU API error [${dokuResponse.status}]: ${JSON.stringify(dokuData)}`);
    }

    console.log("DOKU payment created successfully:", dokuData);

    // Store payment URL in order (optional metadata)
    const paymentUrl = dokuData?.response?.payment?.url || dokuData?.payment?.url;

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: paymentUrl,
        doku_response: dokuData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating DOKU payment:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
