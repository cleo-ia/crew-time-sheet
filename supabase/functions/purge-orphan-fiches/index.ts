import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { addWeeks, parse, startOfISOWeek, format } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const parseISOWeek = (weekString: string): Date => {
  const normalized = weekString.replace("-S", "-W");
  const parsed = parse(normalized, "RRRR-'W'II", new Date());
  return startOfISOWeek(parsed);
};

const calculatePreviousWeek = (semaine: string): string => {
  const currentDate = parseISOWeek(semaine);
  const previousWeekDate = addWeeks(currentDate, -1);
  return format(previousWeekDate, "RRRR-'S'II");
};

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

    if (!semaine || typeof semaine !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "semaine" parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[purge-orphan-fiches] Starting purge for semaine=${semaine}, conducteurId=${conducteurId}, finisseurId=${finisseurId}`);

    const previousWeek = calculatePreviousWeek(semaine);
    console.log(`[purge-orphan-fiches] previousWeek=${previousWeek}`);

    // 1. Get finisseurs assigned in previous week
    let previousFinisseursQuery = supabase
      .from('affectations_finisseurs_jours')
      .select('finisseur_id')
      .eq('semaine', previousWeek);

    if (conducteurId) {
      previousFinisseursQuery = previousFinisseursQuery.eq('conducteur_id', conducteurId);
    }

    const { data: previousAffectations, error: affError } = await previousFinisseursQuery;

    if (affError) throw affError;

    const assignedFinisseurIds = new Set(
      (previousAffectations || []).map((a: any) => a.finisseur_id)
    );

    console.log(`[purge-orphan-fiches] Finisseurs assigned in ${previousWeek}:`, Array.from(assignedFinisseurIds));

    // 2. Find orphan fiches in current semaine
    let orphanFichesQuery = supabase
      .from('fiches')
      .select('id, salarie_id, user_id')
      .eq('semaine', semaine)
      .is('chantier_id', null);

    if (conducteurId) {
      orphanFichesQuery = orphanFichesQuery.eq('user_id', conducteurId);
    }

    const { data: allFiches, error: fichesError } = await orphanFichesQuery;

    if (fichesError) throw fichesError;

    let orphanFiches = allFiches || [];

    // Filter orphans: either not in previousWeek OR specifically finisseurId
    if (finisseurId) {
      orphanFiches = orphanFiches.filter((f: any) => f.salarie_id === finisseurId);
    } else {
      orphanFiches = orphanFiches.filter((f: any) => !assignedFinisseurIds.has(f.salarie_id));
    }

    console.log(`[purge-orphan-fiches] Found ${orphanFiches.length} orphan fiches:`, orphanFiches.map((f: any) => f.id));

    if (orphanFiches.length === 0) {
      return new Response(
        JSON.stringify({ 
          ok: true, 
          semaine, 
          previousWeek,
          deleted: { fiches: 0, jours: 0, signatures: 0, transport_finisseurs: 0, transport_jours: 0 },
          message: 'No orphan fiches found'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orphanFicheIds = orphanFiches.map((f: any) => f.id);
    const orphanFinisseurIds = orphanFiches.map((f: any) => f.salarie_id);

    // 3. Delete in order: fiches_jours, signatures, transport_finisseurs_jours, transport_finisseurs, fiches

    // Delete fiches_jours
    const { count: deletedJours, error: joursError } = await supabase
      .from('fiches_jours')
      .delete({ count: 'exact' })
      .in('fiche_id', orphanFicheIds);

    if (joursError) throw joursError;
    console.log(`[purge-orphan-fiches] Deleted ${deletedJours || 0} fiches_jours`);

    // Delete signatures
    const { count: deletedSignatures, error: sigError } = await supabase
      .from('signatures')
      .delete({ count: 'exact' })
      .in('fiche_id', orphanFicheIds);

    if (sigError) throw sigError;
    console.log(`[purge-orphan-fiches] Deleted ${deletedSignatures || 0} signatures`);

    // Delete fiches_transport_finisseurs_jours first
    const { data: transportFinisseurs, error: tfError } = await supabase
      .from('fiches_transport_finisseurs')
      .select('id')
      .in('finisseur_id', orphanFinisseurIds)
      .eq('semaine', semaine);

    if (tfError) throw tfError;

    const transportFinisseursIds = (transportFinisseurs || []).map((tf: any) => tf.id);

    let deletedTransportJours = 0;
    if (transportFinisseursIds.length > 0) {
      const { count: countTJ, error: tjError } = await supabase
        .from('fiches_transport_finisseurs_jours')
        .delete({ count: 'exact' })
        .in('fiche_transport_finisseur_id', transportFinisseursIds);

      if (tjError) throw tjError;
      deletedTransportJours = countTJ || 0;
      console.log(`[purge-orphan-fiches] Deleted ${deletedTransportJours} fiches_transport_finisseurs_jours`);
    }

    // Delete fiches_transport_finisseurs
    let deletedTransportFinisseurs = 0;
    if (orphanFinisseurIds.length > 0) {
      const { count: countTF, error: tfDelError } = await supabase
        .from('fiches_transport_finisseurs')
        .delete({ count: 'exact' })
        .in('finisseur_id', orphanFinisseurIds)
        .eq('semaine', semaine);

      if (tfDelError) throw tfDelError;
      deletedTransportFinisseurs = countTF || 0;
      console.log(`[purge-orphan-fiches] Deleted ${deletedTransportFinisseurs} fiches_transport_finisseurs`);
    }

    // Finally, delete the fiches themselves
    const { count: deletedFiches, error: ficheDelError } = await supabase
      .from('fiches')
      .delete({ count: 'exact' })
      .in('id', orphanFicheIds);

    if (ficheDelError) throw ficheDelError;
    console.log(`[purge-orphan-fiches] Deleted ${deletedFiches || 0} fiches`);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        semaine,
        previousWeek,
        deleted: {
          fiches: deletedFiches || 0,
          jours: deletedJours || 0,
          signatures: deletedSignatures || 0,
          transport_finisseurs: deletedTransportFinisseurs,
          transport_jours: deletedTransportJours
        }
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
