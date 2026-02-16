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

// Map channel IDs to DOKU API endpoints
function getPaymentConfig(channel: string) {
  const channelMap: Record<string, { target: string; type: string }> = {
    BCA: { target: "/bca-virtual-account/v2/payment-code", type: "va" },
    BNI: { target: "/bni-virtual-account/v2/payment-code", type: "va" },
    BRI: { target: "/bri-virtual-account/v2/payment-code", type: "va" },
    MANDIRI: { target: "/mandiri-virtual-account/v2/payment-code", type: "va" },
    CIMB: { target: "/cimb-virtual-account/v2/payment-code", type: "va" },
    PERMATA: { target: "/permata-virtual-account/v2/payment-code", type: "va" },
    QRIS: { target: "/qris/v1/payment-code", type: "qris" },
    OVO: { target: "/ovo-emoney/v1/payment", type: "ewallet" },
    SHOPEEPAY: { target: "/shopee-pay/v1/payment", type: "ewallet" },
    ALFAMART: { target: "/alfamart/v1/payment-code", type: "retail" },
    INDOMARET: { target: "/indomaret/v1/payment-code", type: "retail" },
  };
  return channelMap[channel] || { target: "/checkout/v1/payment", type: "checkout" };
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { orderId, paymentChannel } = await req.json();
    if (!orderId) throw new Error("orderId is required");

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw new Error("Order not found");

    const channel = paymentChannel || "CHECKOUT";
    const paymentConfig = getPaymentConfig(channel);

    const requestId = crypto.randomUUID();
    const requestTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const requestTarget = paymentConfig.target;
    const dokuBaseUrl = "https://api-sandbox.doku.com";

    let bodyPayload: any;

    if (paymentConfig.type === "checkout") {
      // Fallback: DOKU Checkout (redirect)
      bodyPayload = {
        order: {
          amount: order.total_amount,
          invoice_number: order.order_number,
          currency: "IDR",
          callback_url: `${req.headers.get("origin") || "https://northveiz-web-fashion.lovable.app"}/payment?orderId=${orderId}&orderNumber=${order.order_number}`,
          line_items: [{
            name: order.product_name,
            price: order.total_amount,
            quantity: order.quantity,
          }],
        },
        payment: { payment_due_date: 60 },
        customer: {
          id: order.user_id || orderId,
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
          address: order.shipping_address,
          country: "ID",
        },
      };
    } else if (paymentConfig.type === "va") {
      bodyPayload = {
        order: {
          amount: order.total_amount,
          invoice_number: order.order_number,
        },
        virtual_account_info: {
          expired_time: 60,
          reusable_status: false,
        },
        customer: {
          name: order.customer_name,
          email: order.customer_email,
        },
      };
    } else if (paymentConfig.type === "qris") {
      bodyPayload = {
        order: {
          amount: order.total_amount,
          invoice_number: order.order_number,
        },
        payment: {
          payment_due_date: 60,
        },
      };
    } else if (paymentConfig.type === "ewallet") {
      bodyPayload = {
        order: {
          amount: order.total_amount,
          invoice_number: order.order_number,
          callback_url: `${req.headers.get("origin") || "https://northveiz-web-fashion.lovable.app"}/payment?orderId=${orderId}&orderNumber=${order.order_number}`,
        },
        payment: {
          payment_due_date: 60,
        },
        customer: {
          id: order.user_id || orderId,
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
        },
      };
    } else if (paymentConfig.type === "retail") {
      bodyPayload = {
        order: {
          amount: order.total_amount,
          invoice_number: order.order_number,
        },
        payment: {
          payment_due_date: 60,
        },
        customer: {
          name: order.customer_name,
          email: order.customer_email,
        },
      };
    }

    const bodyString = JSON.stringify(bodyPayload);
    const digest = await generateDigest(bodyString);
    const signature = await generateSignature(
      DOKU_CLIENT_ID, requestId, requestTimestamp, requestTarget, digest, DOKU_SECRET_KEY
    );

    console.log("Calling DOKU API...", { requestId, channel, requestTarget, orderNumber: order.order_number });

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

    console.log("DOKU payment created successfully:", JSON.stringify(dokuData));

    // Extract relevant info based on payment type
    const response: any = { success: true, doku_response: dokuData };

    if (paymentConfig.type === "va") {
      const vaInfo = dokuData?.virtual_account_info || {};
      response.va_number = vaInfo.virtual_account_number;
      response.expiry_time = vaInfo.expired_date;
    } else if (paymentConfig.type === "qris") {
      response.qr_code_url = dokuData?.qr_string || dokuData?.qr?.url;
    } else if (paymentConfig.type === "ewallet") {
      const payment = dokuData?.response?.payment || dokuData?.payment || {};
      response.payment_url = payment?.url || dokuData?.payment_url;
    } else if (paymentConfig.type === "retail") {
      const retailInfo = dokuData?.payment_code_info || dokuData?.payment || {};
      response.payment_code = retailInfo.payment_code || dokuData?.payment_code;
      response.expiry_time = retailInfo.expired_date;
    } else {
      response.payment_url = dokuData?.response?.payment?.url || dokuData?.payment?.url;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error creating DOKU payment:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
