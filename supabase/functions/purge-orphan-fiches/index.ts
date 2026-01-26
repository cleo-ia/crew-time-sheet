import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-entreprise-id',
};

/**
 * ⚠️ DEPRECATED: Cette fonction est dépréciée car toutes les fiches ont maintenant
 * un chantier_id obligatoire. Il n'y a plus de concept de "fiche orpheline".
 * 
 * Cette fonction reste disponible pour compatibilité avec les appels existants
 * mais retourne simplement un succès sans effectuer de suppression.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { semaine, conducteurId, finisseurId } = await req.json();

    console.log(`[purge-orphan-fiches] DEPRECATED - Function called but no action taken`);
    console.log(`[purge-orphan-fiches] Params: semaine=${semaine}, conducteurId=${conducteurId}, finisseurId=${finisseurId}`);
    console.log(`[purge-orphan-fiches] All fiches now have mandatory chantier_id - no orphans possible`);

    // Retourne un succès avec 0 suppressions car le concept n'existe plus
    return new Response(
      JSON.stringify({ 
        ok: true, 
        semaine,
        deprecated: true,
        message: 'Cette fonction est dépréciée. Toutes les fiches ont maintenant un chantier_id obligatoire.',
        deleted: { fiches: 0, jours: 0, signatures: 0, transport_finisseurs: 0, transport_jours: 0 }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[purge-orphan-fiches] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
