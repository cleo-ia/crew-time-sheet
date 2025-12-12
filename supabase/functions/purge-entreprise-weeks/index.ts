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

    const deleted: Record<string, number> = {};

    // 1. Récupérer les fiches avec chantier_id (maçons, grutiers, etc.)
    const { data: fichesChantier, error: fichesChantierError } = await supabase
      .from("fiches")
      .select("id, chantier_id, chantiers!inner(entreprise_id)")
      .eq("chantiers.entreprise_id", entreprise_id)
      .in("semaine", semaines);

    if (fichesChantierError) {
      console.error("Erreur récupération fiches chantier:", fichesChantierError);
    }

    const fichesChantierIds = fichesChantier?.map((f) => f.id) || [];
    console.log(`${fichesChantierIds.length} fiches chantier à supprimer`);

    // 2. Récupérer les fiches finisseurs (sans chantier_id, liées via salarie_id)
    const { data: fichesFinisseur, error: fichesFinisseurError } = await supabase
      .from("fiches")
      .select("id, salarie_id, utilisateurs!fiches_salarie_id_fkey(entreprise_id)")
      .is("chantier_id", null)
      .not("salarie_id", "is", null)
      .eq("utilisateurs.entreprise_id", entreprise_id)
      .in("semaine", semaines);

    if (fichesFinisseurError) {
      console.error("Erreur récupération fiches finisseur:", fichesFinisseurError);
    }

    const fichesFinisseurIds = fichesFinisseur?.map((f) => f.id) || [];
    console.log(`${fichesFinisseurIds.length} fiches finisseur à supprimer`);

    // Combiner tous les IDs de fiches
    const allFicheIds = [...fichesChantierIds, ...fichesFinisseurIds];
    console.log(`Total: ${allFicheIds.length} fiches à supprimer`);

    if (allFicheIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucune fiche à supprimer", deleted: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Supprimer fiches_transport_finisseurs_jours
    const { data: ftfIds } = await supabase
      .from("fiches_transport_finisseurs")
      .select("id")
      .in("fiche_id", allFicheIds);

    if (ftfIds && ftfIds.length > 0) {
      const ftfIdList = ftfIds.map((ftf) => ftf.id);
      const { error: ftfjError } = await supabase
        .from("fiches_transport_finisseurs_jours")
        .delete()
        .in("fiche_transport_finisseur_id", ftfIdList);
      if (ftfjError) console.error("Erreur fiches_transport_finisseurs_jours:", ftfjError);
      deleted.fiches_transport_finisseurs_jours = ftfIdList.length;
    }

    // 4. Supprimer fiches_transport_finisseurs
    const { error: ftfError } = await supabase
      .from("fiches_transport_finisseurs")
      .delete()
      .in("fiche_id", allFicheIds);
    if (ftfError) console.error("Erreur fiches_transport_finisseurs:", ftfError);
    deleted.fiches_transport_finisseurs = ftfIds?.length || 0;

    // 5. Supprimer fiches_transport_jours (pour fiches chantier)
    const { data: ftIds } = await supabase
      .from("fiches_transport")
      .select("id")
      .in("fiche_id", allFicheIds);

    if (ftIds && ftIds.length > 0) {
      const ftIdList = ftIds.map((ft) => ft.id);
      const { error: ftjError } = await supabase
        .from("fiches_transport_jours")
        .delete()
        .in("fiche_transport_id", ftIdList);
      if (ftjError) console.error("Erreur fiches_transport_jours:", ftjError);
      deleted.fiches_transport_jours = ftIdList.length;
    }

    // 6. Supprimer fiches_transport
    const { error: ftError } = await supabase
      .from("fiches_transport")
      .delete()
      .in("fiche_id", allFicheIds);
    if (ftError) console.error("Erreur fiches_transport:", ftError);
    deleted.fiches_transport = ftIds?.length || 0;

    // 7. Supprimer signatures
    const { error: sigError } = await supabase
      .from("signatures")
      .delete()
      .in("fiche_id", allFicheIds);
    if (sigError) console.error("Erreur signatures:", sigError);

    // 8. Supprimer fiches_jours
    const { error: fjError } = await supabase
      .from("fiches_jours")
      .delete()
      .in("fiche_id", allFicheIds);
    if (fjError) console.error("Erreur fiches_jours:", fjError);

    // 9. Supprimer fiches
    const { error: fError } = await supabase
      .from("fiches")
      .delete()
      .in("id", allFicheIds);
    if (fError) console.error("Erreur fiches:", fError);

    deleted.fiches_chantier = fichesChantierIds.length;
    deleted.fiches_finisseur = fichesFinisseurIds.length;
    deleted.fiches_total = allFicheIds.length;

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
