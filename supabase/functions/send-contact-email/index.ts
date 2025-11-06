import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  category: string;
  message: string;
}

const categoryLabels: Record<string, string> = {
  general: "General Inquiry",
  "kritik-saran": "Kritik & Saran",
  business: "Business/Partnership",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, category, message }: ContactEmailRequest = await req.json();

    // Basic server-side validation and sanitization
    if (
      !name || name.trim().length < 2 ||
      !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
      !message || message.trim().length < 10
    ) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const safeName = name.trim().slice(0, 100);
    const safeEmail = email.trim().slice(0, 255);
    const safeCategory = (category || "general").toLowerCase();
    const safeMessage = message.trim().slice(0, 2000);

    console.log("Sending contact email:", { name: safeName, email: safeEmail, category: safeCategory });

    // First, save to database
    const { data: savedMessage, error: dbError } = await supabase
      .from('contact_messages')
      .insert({
        name: safeName,
        email: safeEmail,
        category: safeCategory,
        message: safeMessage,
        send_status: 'received'
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to save message" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Message saved to database:", savedMessage.id);

    const categoryLabel = categoryLabels[safeCategory] || safeCategory;

    const emailResponse = await resend.emails.send({
      from: "Northveiz Store <onboarding@resend.dev>",
      to: ["northveiz@gmail.com"],
      replyTo: safeEmail,
      subject: `[WEBSITE CONTACT] ${categoryLabel} - ${safeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Name:</strong> ${safeName}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> ${safeEmail}</p>
            <p style="margin: 10px 0;"><strong>Category:</strong> ${categoryLabel}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Message:</strong></p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
              ${safeMessage}
            </div>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px;">
            This email was sent from the Northveiz Store contact form.
          </p>
        </div>
      `,
    });

    if ((emailResponse as any).error) {
      const err: any = (emailResponse as any).error;
      console.error("Resend send error:", err);
      
      // Update database with failed status
      await supabase
        .from('contact_messages')
        .update({ 
          send_status: 'fallback_notified',
          error: err.message 
        })
        .eq('id', savedMessage.id);
      
      // Still return success since message is saved in database
      console.log("Email failed but message saved in inbox");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Pesan Anda telah kami terima dan akan segera kami proses",
        saved: true,
        email_sent: false 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update database with notified status
    await supabase
      .from('contact_messages')
      .update({ send_status: 'notified' })
      .eq('id', savedMessage.id);

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Pesan berhasil dikirim dan email notifikasi terkirim",
      saved: true,
      email_sent: true 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
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
