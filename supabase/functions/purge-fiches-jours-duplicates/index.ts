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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { ficheId, datesToRemove } = body;

    if (!ficheId || !datesToRemove || !Array.isArray(datesToRemove)) {
      return new Response(
        JSON.stringify({ error: "ficheId and datesToRemove[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete the specified dates from fiches_jours
    const { data: deleted, error: deleteError } = await supabase
      .from("fiches_jours")
      .delete()
      .eq("fiche_id", ficheId)
      .in("date", datesToRemove)
      .select("id, date");

    if (deleteError) {
      throw deleteError;
    }

    // Recalculate total_heures for the fiche
    const { data: joursRestants, error: sumError } = await supabase
      .from("fiches_jours")
      .select("heures")
      .eq("fiche_id", ficheId);

    if (sumError) {
      throw sumError;
    }

    const newTotal = joursRestants?.reduce((sum, j) => sum + (j.heures || 0), 0) || 0;

    const { error: updateError } = await supabase
      .from("fiches")
      .update({ total_heures: newTotal })
      .eq("id", ficheId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: deleted?.length || 0,
        deletedDates: deleted?.map((d) => d.date) || [],
        newTotalHeures: newTotal,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
