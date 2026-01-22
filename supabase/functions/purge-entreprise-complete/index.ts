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

    // 1. Get all fiche IDs for this enterprise (directly via entreprise_id)
    const { data: fiches } = await supabase
      .from("fiches")
      .select("id")
      .eq("entreprise_id", entreprise_id);
    
    const ficheIds = fiches?.map(f => f.id) || [];
    console.log(`Found ${ficheIds.length} fiches to delete for entreprise ${entreprise_id}`);

    // 2. Get all fiches_transport IDs for these fiches
    const { data: fichesTransport } = await supabase
      .from("fiches_transport")
      .select("id")
      .in("fiche_id", ficheIds.length > 0 ? ficheIds : ['00000000-0000-0000-0000-000000000000']);
    
    const fichesTransportIds = fichesTransport?.map(f => f.id) || [];
    console.log(`Found ${fichesTransportIds.length} fiches_transport to delete`);

    // 3. Get all fiches_transport_finisseurs IDs
    const { data: fichesTransportFinisseurs } = await supabase
      .from("fiches_transport_finisseurs")
      .select("id")
      .in("fiche_id", ficheIds.length > 0 ? ficheIds : ['00000000-0000-0000-0000-000000000000']);
    
    const fichesTransportFinisseursIds = fichesTransportFinisseurs?.map(f => f.id) || [];
    console.log(`Found ${fichesTransportFinisseursIds.length} fiches_transport_finisseurs to delete`);

    // Delete in order respecting foreign keys

    // fiches_transport_finisseurs_jours
    if (fichesTransportFinisseursIds.length > 0) {
      const { data, error } = await supabase
        .from("fiches_transport_finisseurs_jours")
        .delete()
        .in("fiche_transport_finisseur_id", fichesTransportFinisseursIds)
        .select();
      if (error) console.error("Error deleting fiches_transport_finisseurs_jours:", error);
      deleted.fiches_transport_finisseurs_jours = data?.length || 0;
    }

    // fiches_transport_finisseurs
    if (fichesTransportFinisseursIds.length > 0) {
      const { data, error } = await supabase
        .from("fiches_transport_finisseurs")
        .delete()
        .in("id", fichesTransportFinisseursIds)
        .select();
      if (error) console.error("Error deleting fiches_transport_finisseurs:", error);
      deleted.fiches_transport_finisseurs = data?.length || 0;
    }

    // fiches_transport_jours
    if (fichesTransportIds.length > 0) {
      const { data, error } = await supabase
        .from("fiches_transport_jours")
        .delete()
        .in("fiche_transport_id", fichesTransportIds)
        .select();
      if (error) console.error("Error deleting fiches_transport_jours:", error);
      deleted.fiches_transport_jours = data?.length || 0;
    }

    // fiches_transport
    if (fichesTransportIds.length > 0) {
      const { data, error } = await supabase
        .from("fiches_transport")
        .delete()
        .in("id", fichesTransportIds)
        .select();
      if (error) console.error("Error deleting fiches_transport:", error);
      deleted.fiches_transport = data?.length || 0;
    }

    // signatures (via entreprise_id directly to catch all)
    {
      const { data, error } = await supabase
        .from("signatures")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      if (error) console.error("Error deleting signatures:", error);
      deleted.signatures = data?.length || 0;
    }

    // fiches_jours (via entreprise_id directly to catch all)
    {
      const { data, error } = await supabase
        .from("fiches_jours")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      if (error) console.error("Error deleting fiches_jours:", error);
      deleted.fiches_jours = data?.length || 0;
    }

    // fiches (via entreprise_id directly to catch all including orphans)
    {
      const { data, error } = await supabase
        .from("fiches")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      if (error) console.error("Error deleting fiches:", error);
      deleted.fiches = data?.length || 0;
    }

    // affectations_finisseurs_jours
    {
      const { data, error } = await supabase
        .from("affectations_finisseurs_jours")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      if (error) console.error("Error deleting affectations_finisseurs_jours:", error);
      deleted.affectations_finisseurs_jours = data?.length || 0;
    }

    // affectations_jours_chef
    {
      const { data, error } = await supabase
        .from("affectations_jours_chef")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      if (error) console.error("Error deleting affectations_jours_chef:", error);
      deleted.affectations_jours_chef = data?.length || 0;
    }

    // affectations
    {
      const { data, error } = await supabase
        .from("affectations")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      if (error) console.error("Error deleting affectations:", error);
      deleted.affectations = data?.length || 0;
    }

    // planning_validations
    {
      const { data, error } = await supabase
        .from("planning_validations")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      if (error) console.error("Error deleting planning_validations:", error);
      deleted.planning_validations = data?.length || 0;
    }

    // planning_affectations
    {
      const { data, error } = await supabase
        .from("planning_affectations")
        .delete()
        .eq("entreprise_id", entreprise_id)
        .select();
      if (error) console.error("Error deleting planning_affectations:", error);
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
