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
    const { entreprise_id } = await req.json();

    if (!entreprise_id) {
      return new Response(
        JSON.stringify({ error: "entreprise_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const deleted: Record<string, number> = {};

    // 1. Get all fiche IDs for this enterprise
    const { data: fiches } = await supabase
      .from("fiches")
      .select("id")
      .eq("entreprise_id", entreprise_id);
    
    const ficheIds = fiches?.map(f => f.id) || [];

    // 2. Get all fiches_transport IDs
    const { data: fichesTransport } = await supabase
      .from("fiches_transport")
      .select("id")
      .eq("entreprise_id", entreprise_id);
    
    const fichesTransportIds = fichesTransport?.map(f => f.id) || [];

    // 3. Get all fiches_transport_finisseurs IDs
    const { data: fichesTransportFinisseurs } = await supabase
      .from("fiches_transport_finisseurs")
      .select("id")
      .eq("entreprise_id", entreprise_id);
    
    const fichesTransportFinisseursIds = fichesTransportFinisseurs?.map(f => f.id) || [];

    // Delete in order respecting foreign keys

    // fiches_transport_finisseurs_jours
    if (fichesTransportFinisseursIds.length > 0) {
      const { data } = await supabase
        .from("fiches_transport_finisseurs_jours")
        .delete()
        .in("fiche_transport_finisseur_id", fichesTransportFinisseursIds)
        .select();
      deleted.fiches_transport_finisseurs_jours = data?.length || 0;
    }

    // fiches_transport_finisseurs
    if (fichesTransportFinisseursIds.length > 0) {
      const { data } = await supabase
        .from("fiches_transport_finisseurs")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      deleted.fiches_transport_finisseurs = data?.length || 0;
    }

    // fiches_transport_jours
    if (fichesTransportIds.length > 0) {
      const { data } = await supabase
        .from("fiches_transport_jours")
        .delete()
        .in("fiche_transport_id", fichesTransportIds)
        .select();
      deleted.fiches_transport_jours = data?.length || 0;
    }

    // fiches_transport
    {
      const { data } = await supabase
        .from("fiches_transport")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      deleted.fiches_transport = data?.length || 0;
    }

    // signatures
    if (ficheIds.length > 0) {
      const { data } = await supabase
        .from("signatures")
        .delete()
        .in("fiche_id", ficheIds)
        .select();
      deleted.signatures = data?.length || 0;
    }

    // fiches_jours
    if (ficheIds.length > 0) {
      const { data } = await supabase
        .from("fiches_jours")
        .delete()
        .in("fiche_id", ficheIds)
        .select();
      deleted.fiches_jours = data?.length || 0;
    }

    // fiches
    {
      const { data } = await supabase
        .from("fiches")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      deleted.fiches = data?.length || 0;
    }

    // affectations_finisseurs_jours
    {
      const { data } = await supabase
        .from("affectations_finisseurs_jours")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      deleted.affectations_finisseurs_jours = data?.length || 0;
    }

    // affectations_jours_chef
    {
      const { data } = await supabase
        .from("affectations_jours_chef")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      deleted.affectations_jours_chef = data?.length || 0;
    }

    // affectations
    {
      const { data } = await supabase
        .from("affectations")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      deleted.affectations = data?.length || 0;
    }

    // planning_validations
    {
      const { data } = await supabase
        .from("planning_validations")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      deleted.planning_validations = data?.length || 0;
    }

    // planning_affectations
    {
      const { data } = await supabase
        .from("planning_affectations")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      deleted.planning_affectations = data?.length || 0;
    }

    const total = Object.values(deleted).reduce((a, b) => a + b, 0);

    return new Response(
      JSON.stringify({ success: true, entreprise_id, deleted, total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Purge error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
