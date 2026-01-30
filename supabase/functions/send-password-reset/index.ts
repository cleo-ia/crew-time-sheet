import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generatePasswordResetEmailHtml } from "../_shared/emailTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mapping des slugs vers les noms d'entreprises
const entrepriseNames: Record<string, string> = {
  "limoge-revillon": "Limoge Revillon",
  "sder": "SDER",
  "engo-bourgogne": "Engo Bourgogne",
};

interface PasswordResetRequest {
  email: string;
  entreprise_slug: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const resend = new Resend(resendApiKey);

    const { email, entreprise_slug }: PasswordResetRequest = await req.json();

    // Validate required fields
    if (!email || !entreprise_slug) {
      return new Response(
        JSON.stringify({ error: "Email et entreprise_slug sont requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email domain
    const emailLower = email.toLowerCase().trim();
    if (!/^[a-z0-9._%+-]+@groupe-engo\.com$/i.test(emailLower)) {
      return new Response(
        JSON.stringify({ error: "L'email doit être @groupe-engo.com" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get enterprise name from slug
    const entrepriseNom = entrepriseNames[entreprise_slug] || "Groupe Engo";

    // Redirect URL for after password reset
    const redirectUrl = `https://crew-time-sheet.lovable.app/auth?entreprise=${entreprise_slug}`;

    console.log(`[send-password-reset] Generating recovery link for ${emailLower} (${entrepriseNom})`);

    // Generate recovery link using Supabase Admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: emailLower,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      console.error("[send-password-reset] Error generating recovery link:", linkError);
      // Don't reveal if user doesn't exist - always return success for security
      return new Response(
        JSON.stringify({ success: true, message: "Si un compte existe, un email a été envoyé." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const recoveryUrl = linkData?.properties?.action_link;
    if (!recoveryUrl) {
      console.error("[send-password-reset] No action_link in response");
      return new Response(
        JSON.stringify({ success: true, message: "Si un compte existe, un email a été envoyé." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[send-password-reset] Recovery link generated, sending email via Resend`);

    // Generate email HTML with dynamic branding
    const emailHtml = generatePasswordResetEmailHtml(entrepriseNom, recoveryUrl, emailLower);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "DIVA - Groupe Engo <rappels-diva-LR@groupe-engo.com>",
      to: [emailLower],
      subject: `Réinitialisation de mot de passe - ${entrepriseNom}`,
      html: emailHtml,
    });

    console.log(`[send-password-reset] Email sent successfully:`, emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Email de réinitialisation envoyé" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-password-reset] Error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
