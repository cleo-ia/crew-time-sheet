// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const n8nUrl = Deno.env.get("N8N_WEBHOOK_URL")!;
const n8nSecret = Deno.env.get("N8N_WEBHOOK_SECRET")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    console.log("[notify-conducteur] 🚀 Démarrage de la vérification des lots...");

    // Log de l'URL cible pour diagnostic
    try {
      const url = new URL(n8nUrl)
      console.log(`[notify-conducteur] 🎯 URL cible: ${url.host}${url.pathname}`)
    } catch (e) {
      console.error(`[notify-conducteur] ⚠️ URL webhook invalide: ${n8nUrl}`)
    }

    // 1) Récupérer les lots prêts depuis la vue v_lots_pret_conducteur
    const { data: lotsView, error: viewError } = await supabase
      .from("v_lots_pret_conducteur")
      .select("chantier_id, semaine, nb_prets, chef_id, conducteur_id")
      .eq("nb_non_prets", 0)
      .gt("nb_prets", 0)
      .is("notif_exists", null);

    if (viewError) {
      console.error("[notify-conducteur] ❌ Erreur query vue:", viewError);
      return new Response(JSON.stringify({ error: "query_view_failed", detail: viewError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!lotsView || lotsView.length === 0) {
      console.log("[notify-conducteur] ℹ️ Aucun lot à notifier");
      return new Response(JSON.stringify({ ok: true, message: "Aucun lot à notifier", results: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[notify-conducteur] 📦 ${lotsView.length} lot(s) prêt(s) détecté(s)`);

    const results: any[] = [];

    // 2) Pour chaque lot, enrichir les données et notifier
    for (const lot of lotsView) {
      console.log(`[notify-conducteur] 🔍 Traitement du lot: ${lot.semaine} / Chantier ID: ${lot.chantier_id}`);

      // Récupérer les infos du chantier
      const { data: chantier, error: chantierError } = await supabase
        .from("chantiers")
        .select("nom, code_chantier, ville")
        .eq("id", lot.chantier_id)
        .single();

      if (chantierError || !chantier) {
        console.error(`[notify-conducteur] ⚠️ Chantier non trouvé pour ID ${lot.chantier_id}:`, chantierError);
        results.push({ 
          lot: { chantier_id: lot.chantier_id, semaine: lot.semaine }, 
          status: "chantier_not_found" 
        });
        continue;
      }

      // Récupérer les infos du conducteur
      const { data: conducteur, error: conducteurError } = await supabase
        .from("utilisateurs")
        .select("email, prenom, nom")
        .eq("auth_user_id", lot.conducteur_id)
        .single();

      if (conducteurError || !conducteur || !conducteur.email) {
        console.error(`[notify-conducteur] ⚠️ Conducteur non trouvé ou sans email pour ID ${lot.conducteur_id}:`, conducteurError);
        results.push({ 
          lot: { chantier_id: lot.chantier_id, semaine: lot.semaine }, 
          status: "conducteur_not_found" 
        });
        continue;
      }

      // Récupérer les infos du chef
      const { data: chef, error: chefError } = await supabase
        .from("utilisateurs")
        .select("prenom, nom")
        .eq("auth_user_id", lot.chef_id)
        .maybeSingle();

      const payload = {
        type: 'notify_conducteur',
        chantier_id: lot.chantier_id,
        semaine: lot.semaine,
        chantier_nom: chantier.nom || "Chantier",
        code_chantier: chantier.code_chantier || "",
        ville: chantier.ville || "",
        conducteur_email: conducteur.email,
        conducteur_prenom: conducteur.prenom || "",
        conducteur_nom: conducteur.nom || "",
        chef_prenom: chef?.prenom || "",
        chef_nom: chef?.nom || "",
        nb_prets: lot.nb_prets,
        appBaseUrl: 'https://crew-time-sheet.lovable.app/validation-conducteur',
      };

      console.log(`[notify-conducteur] 📧 Envoi webhook n8n pour: ${payload.chantier_nom} - ${payload.semaine}`);

      // 3) Appeler le webhook n8n
      try {
        const resp = await fetch(n8nUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-N8N-Secret": n8nSecret,
          },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const errorText = await resp.text();
          console.error(`[notify-conducteur] ❌ Réponse n8n (${resp.status}): ${errorText}`);
          results.push({ 
            lot: payload, 
            status: "webhook_failed", 
            detail: `HTTP ${resp.status}: ${errorText}` 
          });
          continue;
        }

        console.log(`[notify-conducteur] ✅ Webhook n8n OK pour ${payload.semaine}`);

        // 4) Marquer le lot comme notifié (anti-doublon)
        const { error: updErr } = await supabase
          .from("fiches")
          .update({ notification_conducteur_envoyee_at: new Date().toISOString() })
          .eq("chantier_id", payload.chantier_id)
          .eq("semaine", payload.semaine)
          .is("notification_conducteur_envoyee_at", null); // Évite les double-updates

        if (updErr) {
          console.error("[notify-conducteur] ⚠️ Erreur lors de la mise à jour du flag de notification:", updErr);
          results.push({ 
            lot: payload, 
            status: "notified_but_update_failed", 
            detail: updErr 
          });
        } else {
          console.log(`[notify-conducteur] 🎯 Lot marqué comme notifié: ${payload.semaine}`);
          results.push({ 
            lot: payload, 
            status: "notified" 
          });
        }
      } catch (e) {
        console.error("[notify-conducteur] ❌ Exception lors de l'appel webhook:", e);
        results.push({ 
          lot: payload, 
          status: "webhook_error", 
          detail: String(e) 
        });
      }
    }

    console.log(`[notify-conducteur] ✨ Traitement terminé. ${results.filter(r => r.status === 'notified').length}/${results.length} lot(s) notifié(s) avec succès`);

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error("[notify-conducteur] 💥 Erreur globale:", err);
    return new Response(JSON.stringify({ error: "internal_error", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
