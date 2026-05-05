const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BITESHIP_BASE = "https://api.biteship.com/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("BITESHIP_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "BITESHIP_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, payload } = await req.json();

    let url = "";
    let method = "GET";
    let body: string | undefined;

    switch (action) {
      case "couriers":
        url = `${BITESHIP_BASE}/couriers`;
        break;

      case "rates":
        url = `${BITESHIP_BASE}/rates/couriers`;
        method = "POST";
        body = JSON.stringify(payload);
        break;

      case "create_order":
        url = `${BITESHIP_BASE}/orders`;
        method = "POST";
        body = JSON.stringify(payload);
        break;

      case "tracking":
        if (!payload?.waybill_id || !payload?.courier_code) {
          return new Response(JSON.stringify({ error: "waybill_id and courier_code required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        url = `${BITESHIP_BASE}/trackings/${payload.waybill_id}/couriers/${payload.courier_code}`;
        break;

      case "order_detail":
        if (!payload?.order_id) {
          return new Response(JSON.stringify({ error: "order_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        url = `${BITESHIP_BASE}/orders/${payload.order_id}`;
        break;

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };
    if (body) fetchOptions.body = body;

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
