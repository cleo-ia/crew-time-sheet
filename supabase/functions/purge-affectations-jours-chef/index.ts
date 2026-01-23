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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { semaine, entreprise_id } = await req.json();

    if (!semaine || !entreprise_id) {
      return new Response(
        JSON.stringify({ error: "semaine et entreprise_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Purger les affectations_jours_chef pour la semaine et entreprise spécifiées
    const { data, error, count } = await supabase
      .from("affectations_jours_chef")
      .delete({ count: "exact" })
      .eq("semaine", semaine)
      .eq("entreprise_id", entreprise_id)
      .select();

    if (error) {
      console.error("Erreur lors de la purge:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Purge terminée: ${count} entrées supprimées pour ${semaine} / ${entreprise_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_count: count,
        semaine,
        entreprise_id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Erreur:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
