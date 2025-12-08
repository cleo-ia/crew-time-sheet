import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entreprise_id, semaines } = await req.json();

    if (!entreprise_id || !semaines || !Array.isArray(semaines)) {
      return new Response(
        JSON.stringify({ error: "entreprise_id et semaines (array) requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Purge entreprise ${entreprise_id} pour semaines: ${semaines.join(", ")}`);

    // 1. Récupérer les IDs des fiches concernées
    const { data: fiches, error: fichesError } = await supabase
      .from("fiches")
      .select("id, chantier_id, chantiers!inner(entreprise_id)")
      .eq("chantiers.entreprise_id", entreprise_id)
      .in("semaine", semaines);

    if (fichesError) {
      console.error("Erreur récupération fiches:", fichesError);
      throw fichesError;
    }

    const ficheIds = fiches?.map((f) => f.id) || [];
    console.log(`${ficheIds.length} fiches à supprimer`);

    if (ficheIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucune fiche à supprimer", deleted: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deleted: Record<string, number> = {};

    // 2. Supprimer fiches_transport_jours
    const { data: ftIds } = await supabase
      .from("fiches_transport")
      .select("id")
      .in("fiche_id", ficheIds);
    
    if (ftIds && ftIds.length > 0) {
      const ftIdList = ftIds.map((ft) => ft.id);
      const { error: ftjError } = await supabase
        .from("fiches_transport_jours")
        .delete()
        .in("fiche_transport_id", ftIdList);
      if (ftjError) console.error("Erreur fiches_transport_jours:", ftjError);
      deleted.fiches_transport_jours = ftIdList.length;
    }

    // 3. Supprimer fiches_transport
    const { error: ftError } = await supabase
      .from("fiches_transport")
      .delete()
      .in("fiche_id", ficheIds);
    if (ftError) console.error("Erreur fiches_transport:", ftError);
    deleted.fiches_transport = ftIds?.length || 0;

    // 4. Supprimer signatures
    const { error: sigError } = await supabase
      .from("signatures")
      .delete()
      .in("fiche_id", ficheIds);
    if (sigError) console.error("Erreur signatures:", sigError);

    // 5. Supprimer fiches_jours
    const { error: fjError } = await supabase
      .from("fiches_jours")
      .delete()
      .in("fiche_id", ficheIds);
    if (fjError) console.error("Erreur fiches_jours:", fjError);

    // 6. Supprimer fiches
    const { error: fError } = await supabase
      .from("fiches")
      .delete()
      .in("id", ficheIds);
    if (fError) console.error("Erreur fiches:", fError);

    deleted.fiches = ficheIds.length;

    console.log("Purge terminée:", deleted);

    return new Response(
      JSON.stringify({ success: true, deleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erreur purge:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
