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

    // Parse request body for optional IDs
    let ids: string[] | null = null;
    try {
      const body = await req.json();
      if (body.ids && Array.isArray(body.ids)) {
        ids = body.ids;
      }
    } catch {
      // No body or invalid JSON - delete all
    }

    let deleted = 0;

    if (ids && ids.length > 0) {
      // Delete specific demandes by ID
      const { error, count } = await supabase
        .from("demandes_conges")
        .delete({ count: "exact" })
        .in("id", ids);

      if (error) throw error;
      deleted = count || 0;
    } else {
      // Delete all demandes (original behavior)
      const { count: countBefore } = await supabase
        .from("demandes_conges")
        .select("*", { count: "exact", head: true });

      const { error } = await supabase
        .from("demandes_conges")
        .delete()
        .gte("created_at", "1900-01-01");

      if (error) throw error;
      deleted = countBefore || 0;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${deleted} demande(s) de congés supprimée(s)`,
        deleted,
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
