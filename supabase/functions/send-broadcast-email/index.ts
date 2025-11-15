import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastRequest {
  subject: string;
  content: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting broadcast email process...");

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Check if user is admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized: Invalid user");
    }

    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Parse request body
    const { subject, content }: BroadcastRequest = await req.json();

    if (!subject || !content) {
      throw new Error("Subject and content are required");
    }

    // Create broadcast record
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: broadcast, error: broadcastError } = await supabaseServiceClient
      .from('email_broadcasts')
      .insert({
        admin_id: user.id,
        subject,
        content,
        status: 'processing'
      })
      .select()
      .single();

    if (broadcastError) {
      throw new Error(`Failed to create broadcast record: ${broadcastError.message}`);
    }

    console.log("Fetching registered users...");

    const { data: profiles, error: profilesError } = await supabaseServiceClient
      .from("profiles")
      .select("id, full_name");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw new Error("Failed to fetch user profiles");
    }

    console.log(`Found ${profiles?.length || 0} profiles`);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No registered users found" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get user emails from auth.users
    const userIds = profiles.map((p) => p.id);
    const { data: authUsers, error: authError } = await supabaseServiceClient.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      throw new Error("Failed to fetch user emails");
    }

    // Create a map of user emails
    const emailMap = new Map(
      authUsers.users.map((u) => [u.id, { email: u.email, fullName: "" }])
    );

    // Merge profile data with email data
    const usersToEmail = profiles
      .map((profile) => {
        const authData = emailMap.get(profile.id);
        if (authData && authData.email) {
          return {
            email: authData.email,
            fullName: profile.full_name || "Pengguna",
          };
        }
        return null;
      })
      .filter(Boolean);

    console.log(`Prepared ${usersToEmail.length} emails to send`);

    let successCount = 0;
    let failedCount = 0;

    // Send emails in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < usersToEmail.length; i += batchSize) {
      const batch = usersToEmail.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          if (!user) return;

          try {
            const personalizedContent = content.replace(/\[Nama\]/g, user.fullName);

            const htmlContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
                    .footer { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    p { white-space: pre-line; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>NORTHVEIZ</h1>
                      <p style="margin: 0; opacity: 0.9;">Notifikasi Penting</p>
                    </div>
                    <div class="content">
                      <p>Halo ${user.fullName},</p>
                      <p>${personalizedContent}</p>
                    </div>
                    <div class="footer">
                      <p>Email ini dikirim dari Tim NORTHVEIZ</p>
                      <p>© ${new Date().getFullYear()} NORTHVEIZ. All rights reserved.</p>
                    </div>
                  </div>
                </body>
              </html>
            `;

            await resend.emails.send({
              from: "NORTHVEIZ <onboarding@resend.dev>",
              to: [user.email],
              subject: subject,
              html: htmlContent,
            });

            successCount++;
            console.log(`Email sent successfully to ${user.email}`);
          } catch (error: any) {
            failedCount++;
            console.error(`Failed to send email to ${user.email}:`, error.message);
          }
        })
      );

      // Small delay between batches to avoid rate limits
      if (i + batchSize < usersToEmail.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`Broadcast complete: ${successCount} sent, ${failedCount} failed`);

    // Update broadcast record with results
    await supabaseServiceClient
      .from('email_broadcasts')
      .update({
        total_sent: successCount + failedCount,
        total_delivered: successCount,
        total_failed: failedCount,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', broadcast.id);

    return new Response(
      JSON.stringify({
        message: "Broadcast email telah dikirim",
        successCount,
        failedCount,
        totalUsers: usersToEmail.length,
        broadcastId: broadcast.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in broadcast email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
