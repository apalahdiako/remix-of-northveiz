import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastRequest {
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
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized: Invalid user");

    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Unauthorized: Admin access required");

    const { subject, content }: BroadcastRequest = await req.json();
    if (!subject || !content) throw new Error("Subject and content are required");

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: broadcast, error: broadcastError } = await supabaseService
      .from("email_broadcasts")
      .insert({ admin_id: user.id, subject, content, status: "processing" })
      .select()
      .single();
    if (broadcastError) throw new Error(`Failed to create broadcast: ${broadcastError.message}`);

    const { data: profiles } = await supabaseService.from("profiles").select("id, full_name");
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No registered users found" }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: authUsers, error: authError } = await supabaseService.auth.admin.listUsers();
    if (authError) throw new Error("Failed to fetch user emails");

    const emailMap = new Map(authUsers.users.map((u) => [u.id, u.email]));

    const usersToEmail = profiles
      .map((p) => ({ email: emailMap.get(p.id), fullName: p.full_name || "Pengguna" }))
      .filter((u): u is { email: string; fullName: string } => !!u.email);

    console.log(`Sending broadcast to ${usersToEmail.length} users via Brevo`);

    let successCount = 0;
    let failedCount = 0;

    const batchSize = 10;
    for (let i = 0; i < usersToEmail.length; i += batchSize) {
      const batch = usersToEmail.slice(i, i + batchSize);

      await Promise.all(batch.map(async (u) => {
        try {
          const personalizedContent = content.replace(/\[Nama\]/g, u.fullName);
          const htmlContent = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#fff;padding:30px;border:1px solid #e0e0e0}.footer{background:#f5f5f5;padding:20px;text-align:center;border-radius:0 0 10px 10px;font-size:12px;color:#666}p{white-space:pre-line}</style>
</head><body><div class="container">
<div class="header"><h1>NORTHVEIZ</h1><p style="margin:0;opacity:.9">Notifikasi Penting</p></div>
<div class="content"><p>Halo ${u.fullName},</p><p>${personalizedContent}</p></div>
<div class="footer"><p>Email ini dikirim dari Tim NORTHVEIZ</p><p>&copy; ${new Date().getFullYear()} NORTHVEIZ. All rights reserved.</p></div>
</div></body></html>`;

          const res = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
              sender: { name: "Northveiz Admin", email: "admin@northveiz.com" },
              to: [{ email: u.email }],
              subject,
              htmlContent,
            }),
          });

          if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Brevo ${res.status}: ${errBody}`);
          }
          await res.json();
          successCount++;
          console.log(`Email sent to ${u.email}`);
        } catch (err: any) {
          failedCount++;
          console.error(`Failed ${u.email}: ${err.message}`);
        }
      }));

      if (i + batchSize < usersToEmail.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    await supabaseService.from("email_broadcasts").update({
      total_sent: successCount + failedCount,
      total_delivered: successCount,
      total_failed: failedCount,
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", broadcast.id);

    return new Response(JSON.stringify({
      message: "Broadcast email telah dikirim",
      successCount, failedCount, totalUsers: usersToEmail.length, broadcastId: broadcast.id,
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Broadcast error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
