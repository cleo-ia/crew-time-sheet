import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-entreprise-id',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { semaine, chantier_id, entreprise_id, clear_chef_assignments } = await req.json();

    // Validate semaine parameter
    if (!semaine || typeof semaine !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "semaine" parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate entreprise_id parameter (MANDATORY for safety)
    if (!entreprise_id || typeof entreprise_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "entreprise_id" parameter - required for safety' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security: Only allow purging specific weeks
    const allowedWeeks = ['2026-S07', '2026-S06', '2026-S05', '2026-S04', '2026-S03', '2025-S03', '2025-S43', '2025-S44', '2025-S45', '2025-S46', '2025-S47'];
    if (!allowedWeeks.includes(semaine)) {
      return new Response(
        JSON.stringify({ error: `Cette fonction ne peut purger que les semaines: ${allowedWeeks.join(', ')}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch enterprise info for logging
    const { data: entreprise } = await supabase
      .from('entreprises')
      .select('nom, slug')
      .eq('id', entreprise_id)
      .single();

    const entrepriseLabel = entreprise?.slug || entreprise?.nom || entreprise_id;
    const filterByChantier = chantier_id && typeof chantier_id === 'string';
    
    console.log(`🚀 Starting purge for week: ${semaine}, entreprise: ${entrepriseLabel}${filterByChantier ? `, chantier: ${chantier_id}` : ''}`);

    const results: Record<string, number> = {};

    // Step 1: Delete affectations_finisseurs_jours
    console.log('Step 1: Deleting affectations_finisseurs_jours...');
    let affQuery = supabase
      .from('affectations_finisseurs_jours')
      .delete({ count: 'exact' })
      .eq('semaine', semaine)
      .eq('entreprise_id', entreprise_id);
    
    if (filterByChantier) {
      affQuery = affQuery.eq('chantier_id', chantier_id);
    }
    
    const { error: affError, count: affCount } = await affQuery;
    
    if (affError) throw affError;
    results.affectations_finisseurs_jours = affCount || 0;
    console.log(`✅ Deleted ${affCount} affectations_finisseurs_jours`);

    // Step 1.5: Delete affectations (maçons/grutiers) for this week
    // Calculate date range for the week (Monday to Friday)
    console.log('Step 1.5: Deleting affectations (maçons/grutiers)...');
    const weekMatch = semaine.match(/(\d{4})-S(\d{2})/);
    if (weekMatch) {
      const year = parseInt(weekMatch[1]);
      const week = parseInt(weekMatch[2]);
      
      // Calculate first day of the week (Monday)
      const firstDayOfYear = new Date(year, 0, 1);
      const daysOffset = (week - 1) * 7 + (1 - firstDayOfYear.getDay() + 7) % 7;
      const startDate = new Date(year, 0, 1 + daysOffset);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // End of week (Sunday)
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      let affMaconsQuery = supabase
        .from('affectations')
        .delete({ count: 'exact' })
        .gte('date_debut', startDateStr)
        .lte('date_debut', endDateStr)
        .eq('entreprise_id', entreprise_id);
      
      if (filterByChantier) {
        affMaconsQuery = affMaconsQuery.eq('chantier_id', chantier_id);
      }
      
      const { error: affMaconsError, count: affMaconsCount } = await affMaconsQuery;
      
      if (affMaconsError) throw affMaconsError;
      results.affectations = affMaconsCount || 0;
      console.log(`✅ Deleted ${affMaconsCount} affectations for week ${semaine}`);
    } else {
      results.affectations = 0;
    }

    // Step 2: Get fiches for this week (and optionally chantier)
    console.log('Step 2: Getting fiches...');
    let fichesQuery = supabase
      .from('fiches')
      .select('id')
      .eq('semaine', semaine)
      .eq('entreprise_id', entreprise_id);
    
    if (filterByChantier) {
      fichesQuery = fichesQuery.eq('chantier_id', chantier_id);
    }
    
    const { data: fichesIds } = await fichesQuery;
    console.log(`Found ${fichesIds?.length || 0} fiches to delete`);

    // Step 3: Delete signatures
    console.log('Step 3: Deleting signatures...');
    if (fichesIds && fichesIds.length > 0) {
      const ficheIdsList = fichesIds.map(f => f.id);
      const { error: sigError, count: sigCount } = await supabase
        .from('signatures')
        .delete({ count: 'exact' })
        .in('fiche_id', ficheIdsList)
        .eq('entreprise_id', entreprise_id);
      
      if (sigError) throw sigError;
      results.signatures = sigCount || 0;
      console.log(`✅ Deleted ${sigCount} signatures`);
    } else {
      results.signatures = 0;
    }

    // Step 4: Delete fiches_transport_finisseurs_jours
    console.log('Step 4: Deleting fiches_transport_finisseurs_jours...');
    let ftfQuery = supabase
      .from('fiches_transport_finisseurs')
      .select('id')
      .eq('semaine', semaine)
      .eq('entreprise_id', entreprise_id);
    
    // Filter by fiche_id if we have filtered fiches
    if (filterByChantier && fichesIds && fichesIds.length > 0) {
      const ficheIdsList = fichesIds.map(f => f.id);
      ftfQuery = ftfQuery.in('fiche_id', ficheIdsList);
    } else if (filterByChantier && (!fichesIds || fichesIds.length === 0)) {
      // No fiches for this chantier, skip
      results.fiches_transport_finisseurs_jours = 0;
      results.fiches_transport_finisseurs = 0;
    }
    
    const { data: ftfIds } = await ftfQuery;
    
    if (ftfIds && ftfIds.length > 0) {
      const ftfIdsList = ftfIds.map(f => f.id);
      const { error: ftfjError, count: ftfjCount } = await supabase
        .from('fiches_transport_finisseurs_jours')
        .delete({ count: 'exact' })
        .in('fiche_transport_finisseur_id', ftfIdsList)
        .eq('entreprise_id', entreprise_id);
      
      if (ftfjError) throw ftfjError;
      results.fiches_transport_finisseurs_jours = ftfjCount || 0;
      console.log(`✅ Deleted ${ftfjCount} fiches_transport_finisseurs_jours`);
    } else {
      results.fiches_transport_finisseurs_jours = results.fiches_transport_finisseurs_jours ?? 0;
    }

    // Step 5: Delete fiches_transport_finisseurs
    console.log('Step 5: Deleting fiches_transport_finisseurs...');
    if (ftfIds && ftfIds.length > 0) {
      const ftfIdsList = ftfIds.map(f => f.id);
      const { error: ftfError, count: ftfCount } = await supabase
        .from('fiches_transport_finisseurs')
        .delete({ count: 'exact' })
        .in('id', ftfIdsList)
        .eq('entreprise_id', entreprise_id);
      
      if (ftfError) throw ftfError;
      results.fiches_transport_finisseurs = ftfCount || 0;
      console.log(`✅ Deleted ${ftfCount} fiches_transport_finisseurs`);
    } else {
      results.fiches_transport_finisseurs = results.fiches_transport_finisseurs ?? 0;
    }

    // Step 6: Delete fiches_transport_jours
    console.log('Step 6: Deleting fiches_transport_jours...');
    let ftQuery = supabase
      .from('fiches_transport')
      .select('id')
      .eq('semaine', semaine)
      .eq('entreprise_id', entreprise_id);
    
    if (filterByChantier) {
      ftQuery = ftQuery.eq('chantier_id', chantier_id);
    }
    
    const { data: ftIds } = await ftQuery;
    
    if (ftIds && ftIds.length > 0) {
      const ftIdsList = ftIds.map(f => f.id);
      const { error: ftjError, count: ftjCount } = await supabase
        .from('fiches_transport_jours')
        .delete({ count: 'exact' })
        .in('fiche_transport_id', ftIdsList)
        .eq('entreprise_id', entreprise_id);
      
      if (ftjError) throw ftjError;
      results.fiches_transport_jours = ftjCount || 0;
      console.log(`✅ Deleted ${ftjCount} fiches_transport_jours`);
    } else {
      results.fiches_transport_jours = 0;
    }

    // Step 7: Delete fiches_transport
    console.log('Step 7: Deleting fiches_transport...');
    if (ftIds && ftIds.length > 0) {
      const ftIdsList = ftIds.map(f => f.id);
      const { error: ftError, count: ftCount } = await supabase
        .from('fiches_transport')
        .delete({ count: 'exact' })
        .in('id', ftIdsList)
        .eq('entreprise_id', entreprise_id);
      
      if (ftError) throw ftError;
      results.fiches_transport = ftCount || 0;
      console.log(`✅ Deleted ${ftCount} fiches_transport`);
    } else {
      results.fiches_transport = 0;
    }

    // Step 8: Delete fiches_jours
    console.log('Step 8: Deleting fiches_jours...');
    if (fichesIds && fichesIds.length > 0) {
      const ficheIdsList = fichesIds.map(f => f.id);
      const { error: fjError, count: fjCount } = await supabase
        .from('fiches_jours')
        .delete({ count: 'exact' })
        .in('fiche_id', ficheIdsList)
        .eq('entreprise_id', entreprise_id);
      
      if (fjError) throw fjError;
      results.fiches_jours = fjCount || 0;
      console.log(`✅ Deleted ${fjCount} fiches_jours`);
    } else {
      results.fiches_jours = 0;
    }

    // Step 9: Delete fiches
    console.log('Step 9: Deleting fiches...');
    if (fichesIds && fichesIds.length > 0) {
      const ficheIdsList = fichesIds.map(f => f.id);
      const { error: fichesError, count: fichesCount } = await supabase
        .from('fiches')
        .delete({ count: 'exact' })
        .in('id', ficheIdsList)
        .eq('entreprise_id', entreprise_id);
      
      if (fichesError) throw fichesError;
      results.fiches = fichesCount || 0;
      console.log(`✅ Deleted ${fichesCount} fiches`);
    } else {
      results.fiches = 0;
    }

    // Step 10: Delete affectations_jours_chef
    console.log('Step 10: Deleting affectations_jours_chef...');
    let ajcQuery = supabase
      .from('affectations_jours_chef')
      .delete({ count: 'exact' })
      .eq('semaine', semaine)
      .eq('entreprise_id', entreprise_id);

    if (filterByChantier) {
      ajcQuery = ajcQuery.eq('chantier_id', chantier_id);
    }

    const { error: ajcError, count: ajcCount } = await ajcQuery;
    if (ajcError) throw ajcError;
    results.affectations_jours_chef = ajcCount || 0;
    console.log(`✅ Deleted ${ajcCount} affectations_jours_chef`);

    // Step 11: Delete planning_affectations
    console.log('Step 11: Deleting planning_affectations...');
    let paQuery = supabase
      .from('planning_affectations')
      .delete({ count: 'exact' })
      .eq('semaine', semaine)
      .eq('entreprise_id', entreprise_id);

    if (filterByChantier) {
      paQuery = paQuery.eq('chantier_id', chantier_id);
    }

    const { error: paError, count: paCount } = await paQuery;
    if (paError) throw paError;
    results.planning_affectations = paCount || 0;
    console.log(`✅ Deleted ${paCount} planning_affectations`);

    // Step 12: Delete planning_validations
    console.log('Step 12: Deleting planning_validations...');
    const { error: pvError, count: pvCount } = await supabase
      .from('planning_validations')
      .delete({ count: 'exact' })
      .eq('semaine', semaine)
      .eq('entreprise_id', entreprise_id);

    if (pvError) throw pvError;
    results.planning_validations = pvCount || 0;
    console.log(`✅ Deleted ${pvCount} planning_validations`);

    // Step 13: Reset chef_id on chantiers (optional, via clear_chef_assignments flag)
    if (clear_chef_assignments) {
      console.log('Step 13: Resetting chef_id on chantiers...');
      
      let resetQuery = supabase
        .from('chantiers')
        .update({ chef_id: null })
        .eq('entreprise_id', entreprise_id)
        .not('chef_id', 'is', null);
      
      if (filterByChantier) {
        resetQuery = resetQuery.eq('id', chantier_id);
      }
      
      const { error: resetError, count: resetCount } = await resetQuery.select('id');
      if (resetError) throw resetError;
      results.chantiers_chef_reset = resetCount || 0;
      console.log(`✅ Reset chef_id on ${resetCount} chantiers`);
    }

    // Calculate total
    const total = Object.values(results).reduce((sum, count) => sum + count, 0);

    console.log(`🎉 Purge completed for ${entrepriseLabel}! Total records deleted: ${total}`);

    return new Response(
      JSON.stringify({
        success: true,
        semaine,
        entreprise_id,
        entreprise_nom: entreprise?.nom || null,
        chantier_id: filterByChantier ? chantier_id : null,
        deleted: results,
        total
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Purge error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
