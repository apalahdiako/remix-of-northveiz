import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "send_code" | "verify_code" | "reset_password";
  email?: string;
  code?: string;
  new_password?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { action, email, code, new_password }: RequestBody = await req.json();

    if (action === "send_code") {
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email harus diisi" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if email exists in auth.users
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) throw userError;

      const userExists = userData.users.some(u => u.email === email);
      if (!userExists) {
        return new Response(
          JSON.stringify({ error: "Email tidak terdaftar" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store code in database
      const { error: insertError } = await supabase
        .from("password_reset_codes")
        .insert({
          email,
          code: verificationCode,
          expires_at: expiresAt.toISOString(),
          used: false,
        });

      if (insertError) throw insertError;

      // Mask email for privacy (e.g., j***n@gmail.com)
      const [localPart, domain] = email.split("@");
      const maskedEmail = `${localPart[0]}${"*".repeat(Math.min(localPart.length - 2, 3))}${localPart[localPart.length - 1]}@${domain}`;

      // Send email with code
      const emailResponse = await resend.emails.send({
        from: "NRTVZ <onboarding@resend.dev>",
        to: [email],
        subject: "Kode Verifikasi Reset Password - NRTVZ",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .code-box { 
                  background: #f4f4f4; 
                  border: 2px solid #333; 
                  border-radius: 10px; 
                  padding: 30px; 
                  text-align: center; 
                  margin: 30px 0; 
                }
                .code { 
                  font-size: 36px; 
                  font-weight: bold; 
                  letter-spacing: 8px; 
                  color: #333; 
                }
                .warning { 
                  color: #666; 
                  font-size: 14px; 
                  margin-top: 20px; 
                }
                .footer { 
                  text-align: center; 
                  color: #999; 
                  font-size: 12px; 
                  margin-top: 40px; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Reset Password</h1>
                  <p>Kami menerima permintaan untuk mereset password akun Anda.</p>
                </div>
                
                <div class="code-box">
                  <p style="margin: 0 0 10px 0; color: #666;">Kode Verifikasi Anda:</p>
                  <div class="code">${verificationCode}</div>
                  <p class="warning">
                    ⏱️ Kode ini akan kedaluwarsa dalam 15 menit<br>
                    🔒 Jangan bagikan kode ini kepada siapa pun
                  </p>
                </div>

                <p style="text-align: center; color: #666;">
                  Jika Anda tidak meminta reset password, abaikan email ini.<br>
                  Password Anda akan tetap aman.
                </p>

                <div class="footer">
                  <p>© ${new Date().getFullYear()} NRTVZ. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log("Email sent successfully:", emailResponse);

      return new Response(
        JSON.stringify({ 
          success: true, 
          masked_email: maskedEmail,
          message: "Kode verifikasi telah dikirim ke email Anda" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "verify_code") {
      if (!email || !code) {
        return new Response(
          JSON.stringify({ error: "Email dan kode harus diisi" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify code
      const { data, error } = await supabase
        .from("password_reset_codes")
        .select("*")
        .eq("email", email)
        .eq("code", code)
        .eq("used", false)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Kode verifikasi tidak valid" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Kode verifikasi telah kedaluwarsa" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Kode verifikasi valid" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "reset_password") {
      if (!email || !code || !new_password) {
        return new Response(
          JSON.stringify({ error: "Semua field harus diisi" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify code again
      const { data: codeData, error: codeError } = await supabase
        .from("password_reset_codes")
        .select("*")
        .eq("email", email)
        .eq("code", code)
        .eq("used", false)
        .single();

      if (codeError || !codeData) {
        return new Response(
          JSON.stringify({ error: "Kode verifikasi tidak valid" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(codeData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Kode verifikasi telah kedaluwarsa" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user by email
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) throw userError;

      const user = userData.users.find(u => u.email === email);
      if (!user) {
        return new Response(
          JSON.stringify({ error: "User tidak ditemukan" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: new_password }
      );

      if (updateError) throw updateError;

      // Mark code as used
      await supabase
        .from("password_reset_codes")
        .update({ used: true })
        .eq("id", codeData.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Password berhasil diubah" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Action tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("Error in password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
