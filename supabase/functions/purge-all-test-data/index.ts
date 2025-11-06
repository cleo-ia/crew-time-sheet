import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[purge-all-test-data] Starting full purge...');
    const deletedCounts: Record<string, number> = {};

    // Étape 1: Supprimer signatures
    console.log('[purge] Step 1/8: Deleting signatures...');
    const { data: signatures, error: sigError } = await supabase
      .from('signatures')
      .delete()
      .gte('created_at', '1900-01-01')
      .select();
    if (sigError) {
      console.error('[purge] ❌ Error deleting signatures:', sigError);
      throw sigError;
    }
    deletedCounts.signatures = signatures?.length || 0;
    console.log(`[purge] ✓ Deleted ${deletedCounts.signatures} signatures`);

    // Étape 2: Supprimer fiches_transport_finisseurs_jours
    console.log('[purge] Step 2/8: Deleting fiches_transport_finisseurs_jours...');
    const { data: ftfj, error: ftfjError } = await supabase
      .from('fiches_transport_finisseurs_jours')
      .delete()
      .gte('created_at', '1900-01-01')
      .select();
    if (ftfjError) {
      console.error('[purge] ❌ Error deleting fiches_transport_finisseurs_jours:', ftfjError);
      throw ftfjError;
    }
    deletedCounts.fiches_transport_finisseurs_jours = ftfj?.length || 0;
    console.log(`[purge] ✓ Deleted ${deletedCounts.fiches_transport_finisseurs_jours} fiches_transport_finisseurs_jours`);

    // Étape 3: Supprimer fiches_transport_finisseurs
    console.log('[purge] Step 3/8: Deleting fiches_transport_finisseurs...');
    const { data: ftf, error: ftfError } = await supabase
      .from('fiches_transport_finisseurs')
      .delete()
      .gte('created_at', '1900-01-01')
      .select();
    if (ftfError) {
      console.error('[purge] ❌ Error deleting fiches_transport_finisseurs:', ftfError);
      throw ftfError;
    }
    deletedCounts.fiches_transport_finisseurs = ftf?.length || 0;
    console.log(`[purge] ✓ Deleted ${deletedCounts.fiches_transport_finisseurs} fiches_transport_finisseurs`);

    // Étape 4: Supprimer fiches_transport_jours
    console.log('[purge] Step 4/8: Deleting fiches_transport_jours...');
    const { data: ftj, error: ftjError } = await supabase
      .from('fiches_transport_jours')
      .delete()
      .gte('created_at', '1900-01-01')
      .select();
    if (ftjError) {
      console.error('[purge] ❌ Error deleting fiches_transport_jours:', ftjError);
      throw ftjError;
    }
    deletedCounts.fiches_transport_jours = ftj?.length || 0;
    console.log(`[purge] ✓ Deleted ${deletedCounts.fiches_transport_jours} fiches_transport_jours`);

    // Étape 5: Supprimer fiches_transport
    console.log('[purge] Step 5/8: Deleting fiches_transport...');
    const { data: ft, error: ftError } = await supabase
      .from('fiches_transport')
      .delete()
      .gte('created_at', '1900-01-01')
      .select();
    if (ftError) {
      console.error('[purge] ❌ Error deleting fiches_transport:', ftError);
      throw ftError;
    }
    deletedCounts.fiches_transport = ft?.length || 0;
    console.log(`[purge] ✓ Deleted ${deletedCounts.fiches_transport} fiches_transport`);

    // Étape 6: Supprimer affectations (maçons)
    console.log('[purge] Step 6/9: Deleting affectations...');
    const { data: aff, error: affError } = await supabase
      .from('affectations')
      .delete()
      .gte('created_at', '1900-01-01')
      .select();
    if (affError) {
      console.error('[purge] ❌ Error deleting affectations:', affError);
      throw affError;
    }
    deletedCounts.affectations = aff?.length || 0;
    console.log(`[purge] ✓ Deleted ${deletedCounts.affectations} affectations`);

    // Étape 7: Supprimer affectations_finisseurs_jours
    console.log('[purge] Step 7/9: Deleting affectations_finisseurs_jours...');
    const { data: afj, error: afjError } = await supabase
      .from('affectations_finisseurs_jours')
      .delete()
      .gte('created_at', '1900-01-01')
      .select();
    if (afjError) {
      console.error('[purge] ❌ Error deleting affectations_finisseurs_jours:', afjError);
      throw afjError;
    }
    deletedCounts.affectations_finisseurs_jours = afj?.length || 0;
    console.log(`[purge] ✓ Deleted ${deletedCounts.affectations_finisseurs_jours} affectations_finisseurs_jours`);

    // Étape 8: Supprimer fiches_jours
    console.log('[purge] Step 8/9: Deleting fiches_jours...');
    const { data: fj, error: fjError } = await supabase
      .from('fiches_jours')
      .delete()
      .gte('created_at', '1900-01-01')
      .select();
    if (fjError) {
      console.error('[purge] ❌ Error deleting fiches_jours:', fjError);
      throw fjError;
    }
    deletedCounts.fiches_jours = fj?.length || 0;
    console.log(`[purge] ✓ Deleted ${deletedCounts.fiches_jours} fiches_jours`);

    // Étape 9: Supprimer fiches
    console.log('[purge] Step 9/9: Deleting fiches...');
    const { data: fiches, error: fichesError } = await supabase
      .from('fiches')
      .delete()
      .gte('created_at', '1900-01-01')
      .select();
    if (fichesError) {
      console.error('[purge] ❌ Error deleting fiches:', fichesError);
      throw fichesError;
    }
    deletedCounts.fiches = fiches?.length || 0;
    console.log(`[purge] ✓ Deleted ${deletedCounts.fiches} fiches`);

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

    // Vérification finale
    console.log('[purge] Verifying remaining records...');
    const { count: remainingFiches } = await supabase
      .from('fiches')
      .select('*', { count: 'exact', head: true });
    const { count: remainingFichesJours } = await supabase
      .from('fiches_jours')
      .select('*', { count: 'exact', head: true });
    const { count: remainingSignatures } = await supabase
      .from('signatures')
      .select('*', { count: 'exact', head: true });

    console.log(`[purge] ✓ Remaining fiches: ${remainingFiches || 0}`);
    console.log(`[purge] ✓ Remaining fiches_jours: ${remainingFichesJours || 0}`);
    console.log(`[purge] ✓ Remaining signatures: ${remainingSignatures || 0}`);

    console.log('[purge-all-test-data] ✅ Full purge completed successfully', deletedCounts);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'All test data purged successfully',
        deleted: deletedCounts,
        total: totalDeleted,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[purge-all-test-data] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
