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
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { semaine } = await req.json();

    if (!semaine || typeof semaine !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "semaine" parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[purge-affectations-finisseurs] Purging semaine=${semaine}`);

    // Count rows first
    const { count: toDeleteCount, error: countError } = await supabase
      .from('affectations_finisseurs_jours')
      .select('*', { count: 'exact', head: true })
      .eq('semaine', semaine);

    if (countError) throw countError;

    // Delete rows
    const { error: deleteError } = await supabase
      .from('affectations_finisseurs_jours')
      .delete()
      .eq('semaine', semaine);

    if (deleteError) throw deleteError;

    const deleted = toDeleteCount || 0;
    console.log(`[purge-affectations-finisseurs] Deleted ${deleted} rows for ${semaine}`);

    return new Response(
      JSON.stringify({ ok: true, semaine, deleted }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[purge-affectations-finisseurs] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});