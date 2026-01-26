import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-entreprise-id',
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

    const { startDate, endDate } = await req.json();

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'Missing startDate or endDate parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[purge-affectations-macons] Purging from ${startDate} to ${endDate}`);

    // Count rows first
    const { count: toDeleteCount, error: countError } = await supabase
      .from('affectations')
      .select('*', { count: 'exact', head: true })
      .gte('date_debut', startDate)
      .lte('date_debut', endDate);

    if (countError) throw countError;

    // Delete rows
    const { error: deleteError } = await supabase
      .from('affectations')
      .delete()
      .gte('date_debut', startDate)
      .lte('date_debut', endDate);

    if (deleteError) throw deleteError;

    const deleted = toDeleteCount || 0;
    console.log(`[purge-affectations-macons] Deleted ${deleted} affectations`);

    return new Response(
      JSON.stringify({ ok: true, deleted }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[purge-affectations-macons] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
