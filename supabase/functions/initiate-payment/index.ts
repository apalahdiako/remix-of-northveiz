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
    
    // Trim whitespace/newlines that may have been pasted with the key
    const MIDTRANS_SERVER_KEY = rawKey.trim();

    // Detect sandbox vs production based on key prefix
    const isSandbox = MIDTRANS_SERVER_KEY.startsWith("SB-");
    const midtransUrl = isSandbox
      ? "https://api.sandbox.midtrans.com/v2/charge"
      : "https://api.midtrans.com/v2/charge";

    // Diagnostic logging (safe: only shows prefix/length, not full key)
    console.log("=== MIDTRANS DIAGNOSTIC ===");
    console.log("Key length:", MIDTRANS_SERVER_KEY.length);
    console.log("Key prefix:", MIDTRANS_SERVER_KEY.substring(0, 15));
    console.log("Key suffix:", MIDTRANS_SERVER_KEY.substring(MIDTRANS_SERVER_KEY.length - 5));
    console.log("Environment:", isSandbox ? "SANDBOX" : "PRODUCTION");
    console.log("API URL:", midtransUrl);

    // Use standard btoa for Base64 encoding (most reliable)
    const authToken = btoa(MIDTRANS_SERVER_KEY + ":");
    console.log("Auth header (first 20 chars):", `Basic ${authToken.substring(0, 20)}...`);

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

    const channel = paymentChannel || "QRIS";
    
    // Ensure unique order_id by appending timestamp suffix
    const uniqueOrderId = `${order.order_number}-${Date.now()}`;
    
    // Ensure gross_amount is integer (Midtrans requirement)
    const grossAmount = Math.floor(Number(order.total_amount));
    if (isNaN(grossAmount) || grossAmount <= 0) {
      throw new Error(`Invalid gross_amount: ${order.total_amount}`);
    }

    let chargePayload: any = {
      transaction_details: {
        order_id: uniqueOrderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
      },
      item_details: [{
        id: order.product_id,
        name: order.product_name.substring(0, 50),
        price: Math.floor(grossAmount / order.quantity),
        quantity: order.quantity,
      }],
    };

    // Build payment type based on channel
    if (channel === "QRIS") {
      chargePayload.payment_type = "qris";
      chargePayload.qris = { acquirer: "gopay" };
    } else if (["BCA", "BNI", "BRI", "MANDIRI", "CIMB", "PERMATA"].includes(channel)) {
      if (channel === "MANDIRI") {
        chargePayload.payment_type = "echannel";
        chargePayload.echannel = {
          bill_info1: "Payment for",
          bill_info2: order.order_number,
        };
      } else if (channel === "PERMATA") {
        chargePayload.payment_type = "permata";
      } else {
        chargePayload.payment_type = "bank_transfer";
        chargePayload.bank_transfer = { bank: channel.toLowerCase() };
      }
    } else if (channel === "GOPAY") {
      chargePayload.payment_type = "gopay";
    } else if (channel === "SHOPEEPAY") {
      chargePayload.payment_type = "shopeepay";
    } else if (channel === "ALFAMART") {
      chargePayload.payment_type = "cstore";
      chargePayload.cstore = { store: "alfamart", message: `Payment ${order.order_number}` };
    } else if (channel === "INDOMARET") {
      chargePayload.payment_type = "cstore";
      chargePayload.cstore = { store: "indomaret", message: `Payment ${order.order_number}` };
    } else {
      // Default to QRIS
      chargePayload.payment_type = "qris";
      chargePayload.qris = { acquirer: "gopay" };
    }

    console.log("Calling Midtrans Charge API...", { 
      channel, 
      uniqueOrderId, 
      grossAmount,
      url: midtransUrl,
      payload: JSON.stringify(chargePayload),
    });

    const midtransResponse = await fetch(midtransUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${authToken}`,
      },
      body: JSON.stringify(chargePayload),
    });

    const midtransData = await midtransResponse.json();

    if (midtransData.status_code && !["200", "201"].includes(midtransData.status_code)) {
      console.error("Midtrans API error response:", JSON.stringify(midtransData, null, 2));
      console.error("HTTP status:", midtransResponse.status);
      throw new Error(`Midtrans error (${midtransData.status_code}): ${midtransData.status_message || JSON.stringify(midtransData)}`);
    }

    console.log("Midtrans charge success:", JSON.stringify(midtransData));

    // Build response based on payment type
    const response: any = {
      success: true,
      midtrans_response: midtransData,
      transaction_id: midtransData.transaction_id,
      expiry_time: midtransData.expiry_time,
    };

    if (channel === "QRIS") {
      // QRIS returns actions with QR URL or qr_string
      const qrAction = midtransData.actions?.find((a: any) => a.name === "generate-qr-code");
      response.type = "qris";
      response.qr_string = midtransData.qr_string;
      response.qr_code_url = qrAction?.url;
    } else if (channel === "MANDIRI") {
      response.type = "va";
      response.va_number = midtransData.bill_key;
      response.biller_code = midtransData.biller_code;
      response.bank_name = "MANDIRI";
    } else if (channel === "PERMATA") {
      response.type = "va";
      response.va_number = midtransData.permata_va_number;
      response.bank_name = "PERMATA";
    } else if (["BCA", "BNI", "BRI", "CIMB"].includes(channel)) {
      const vaNumber = midtransData.va_numbers?.[0]?.va_number;
      response.type = "va";
      response.va_number = vaNumber;
      response.bank_name = channel;
    } else if (["GOPAY", "SHOPEEPAY"].includes(channel)) {
      const deeplink = midtransData.actions?.find((a: any) => a.name === "deeplink-redirect");
      const qr = midtransData.actions?.find((a: any) => a.name === "generate-qr-code");
      response.type = "ewallet";
      response.payment_url = deeplink?.url;
      response.qr_code_url = qr?.url;
    } else if (["ALFAMART", "INDOMARET"].includes(channel)) {
      response.type = "retail";
      response.payment_code = midtransData.payment_code;
      response.store_name = channel === "ALFAMART" ? "Alfamart" : "Indomaret";
    }

    // Update order with payment info
    await supabase.from("orders").update({
      payment_method: channel,
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error creating Midtrans payment:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
