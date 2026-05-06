import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  userIds: string[];
  subject: string;
  content: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Unauthorized: Admin access required");

    const { userIds, subject, content }: EmailRequest = await req.json();
    if (!userIds || userIds.length === 0) throw new Error("No users selected");

    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw new Error(`Failed to fetch users: ${authError.message}`);

    const selectedUsers = authUsers.users.filter((u) => userIds.includes(u.id));

    const results = await Promise.allSettled(selectedUsers.map(async (authUser) => {
      const profile = profiles?.find((p) => p.id === authUser.id);
      const userName = profile?.full_name || authUser.email?.split("@")[0] || "User";
      const personalizedContent = content.replace(/\[NORTHVEIZ\]/g, "NORTHVEIZ");

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: { name: "Northveiz Admin", email: "admin@northveiz.com" },
          to: [{ email: authUser.email! }],
          subject,
          htmlContent: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#333">Halo ${userName},</h2>
  <div style="line-height:1.6;color:#555">${personalizedContent.replace(/\n/g, "<br>")}</div>
  <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;color:#888;font-size:12px">
    <p>Email ini dikirim oleh Tim NORTHVEIZ</p>
  </div>
</div>`,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Brevo ${res.status}: ${errBody}`);
      }
      return res.json();
    }));

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    const successfulUserIds = results
      .map((result, index) => result.status === "fulfilled" ? selectedUsers[index].id : null)
      .filter(Boolean);

    if (successfulUserIds.length > 0) {
      await supabaseAdmin.from("profiles")
        .update({ last_welcome_sent: new Date().toISOString() })
        .in("id", successfulUserIds);
    }

    return new Response(JSON.stringify({ success: true, sent: successful, failed }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
