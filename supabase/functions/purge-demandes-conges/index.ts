import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Compter les demandes avant suppression
    const { count: countBefore } = await supabase
      .from("demandes_conges")
      .select("*", { count: "exact", head: true });

    // Supprimer toutes les demandes de congés
    const { error } = await supabase
      .from("demandes_conges")
      .delete()
      .gte("created_at", "1900-01-01");

    if (error) {
      throw error;
    }

    // Vérifier après suppression
    const { count: countAfter } = await supabase
      .from("demandes_conges")
      .select("*", { count: "exact", head: true });

    return new Response(
      JSON.stringify({
        success: true,
        message: `${countBefore || 0} demandes de congés supprimées`,
        deleted: countBefore || 0,
        remaining: countAfter || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Erreur:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
