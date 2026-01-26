import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-entreprise-id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST method" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { semaine } = await req.json();
    if (!semaine || typeof semaine !== "string") {
      return new Response(JSON.stringify({ error: "Parameter 'semaine' is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    console.log("[purge-transport-week] Starting purge for semaine:", semaine);

    // 1. Get all fiches_transport for this week
    const { data: fiches, error: fErr } = await supabase
      .from("fiches_transport")
      .select("id")
      .eq("semaine", semaine);

    if (fErr) throw fErr;

    const ficheIds = (fiches ?? []).map((f: any) => f.id);
    console.log(`[purge-transport-week] Found ${ficheIds.length} fiches_transport:`, ficheIds);

    let deletedJours = 0;
    let deletedFiches = 0;

    if (ficheIds.length > 0) {
      // 2. Delete fiches_transport_jours
      console.log("[purge-transport-week] Deleting fiches_transport_jours...");
      const { count: joursCount, error: jCountErr } = await supabase
        .from("fiches_transport_jours")
        .select("*", { count: "exact", head: true })
        .in("fiche_transport_id", ficheIds);

      if (jCountErr) throw jCountErr;

      const { error: jDelErr } = await supabase
        .from("fiches_transport_jours")
        .delete()
        .in("fiche_transport_id", ficheIds);

      if (jDelErr) throw jDelErr;

      deletedJours = joursCount || 0;
      console.log(`[purge-transport-week] Deleted ${deletedJours} fiches_transport_jours`);

      // 3. Delete fiches_transport
      console.log("[purge-transport-week] Deleting fiches_transport...");
      const { count: fichesCount, error: fCountErr } = await supabase
        .from("fiches_transport")
        .select("*", { count: "exact", head: true })
        .eq("semaine", semaine);

      if (fCountErr) throw fCountErr;

      const { error: fDelErr } = await supabase
        .from("fiches_transport")
        .delete()
        .eq("semaine", semaine);

      if (fDelErr) throw fDelErr;

      deletedFiches = fichesCount || 0;
      console.log(`[purge-transport-week] Deleted ${deletedFiches} fiches_transport`);
    }

    const response = {
      ok: true,
      semaine,
      deleted_jours: deletedJours,
      deleted_fiches: deletedFiches,
      note: ficheIds.length === 0 ? "No fiches_transport found for this week" : undefined,
    };

    console.log("[purge-transport-week] Purge completed successfully:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[purge-transport-week] Error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
