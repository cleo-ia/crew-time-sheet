// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  generateEmailHtml, 
  createAlertBox, 
  createChantierCard, 
  createClosingMessage 
} from "../_shared/emailTemplate.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const resend = new Resend(resendApiKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    console.log("[notify-conducteur] 🚀 Démarrage de la vérification des lots...");

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

      // Récupérer les infos du conducteur - CORRECTION: utiliser "id" au lieu de "auth_user_id"
      const { data: conducteur, error: conducteurError } = await supabase
        .from("utilisateurs")
        .select("email, prenom, nom")
        .eq("id", lot.conducteur_id)
        .single();

      if (conducteurError || !conducteur || !conducteur.email) {
        console.error(`[notify-conducteur] ⚠️ Conducteur non trouvé ou sans email pour ID ${lot.conducteur_id}:`, conducteurError);
        results.push({ 
          lot: { chantier_id: lot.chantier_id, semaine: lot.semaine }, 
          status: "conducteur_not_found" 
        });
        continue;
      }

      // Récupérer les infos du chef - CORRECTION: utiliser "id" au lieu de "auth_user_id"
      const { data: chef } = await supabase
        .from("utilisateurs")
        .select("prenom, nom")
        .eq("id", lot.chef_id)
        .maybeSingle();

      const chefNomComplet = chef ? `${chef.prenom || ''} ${chef.nom || ''}`.trim() : 'Le chef d\'équipe';

      // Construire le contenu HTML avec les templates partagés
      const emailContent = `
        ${createAlertBox(
          `<strong>${chefNomComplet}</strong> vient de transmettre <strong>${lot.nb_prets} fiche(s)</strong> pour validation.`,
          'info'
        )}
        ${createChantierCard(chantier.nom, lot.nb_prets)}
        ${createClosingMessage('Merci de valider ces fiches dès que possible.')}
      `;

      const emailHtml = generateEmailHtml(
        conducteur.prenom || 'Conducteur',
        emailContent,
        'https://crew-time-sheet.lovable.app/validation-conducteur',
        'Valider les fiches',
        'validation'
      );

      console.log(`[notify-conducteur] 📧 Envoi email Resend pour: ${chantier.nom} - ${lot.semaine} à ${conducteur.email}`);

      // 3) Envoyer l'email via Resend
      try {
        const emailResponse = await resend.emails.send({
          from: 'DIVA Rappels <rappels-diva-LR@groupe-engo.com>',
          to: [conducteur.email],
          subject: `${lot.nb_prets} fiche(s) transmise(s) - ${chantier.nom} (${lot.semaine})`,
          html: emailHtml,
        });

        console.log(`[notify-conducteur] ✅ Email envoyé avec succès:`, emailResponse);

        // 4) Marquer le lot comme notifié (anti-doublon)
        const { error: updErr } = await supabase
          .from("fiches")
          .update({ notification_conducteur_envoyee_at: new Date().toISOString() })
          .eq("chantier_id", lot.chantier_id)
          .eq("semaine", lot.semaine)
          .is("notification_conducteur_envoyee_at", null);

        if (updErr) {
          console.error("[notify-conducteur] ⚠️ Erreur lors de la mise à jour du flag de notification:", updErr);
          results.push({ 
            lot: { 
              chantier_id: lot.chantier_id, 
              semaine: lot.semaine, 
              chantier_nom: chantier.nom,
              conducteur_email: conducteur.email 
            }, 
            status: "notified_but_update_failed", 
            detail: updErr 
          });
        } else {
          console.log(`[notify-conducteur] 🎯 Lot marqué comme notifié: ${lot.semaine}`);
          results.push({ 
            lot: { 
              chantier_id: lot.chantier_id, 
              semaine: lot.semaine, 
              chantier_nom: chantier.nom,
              conducteur_email: conducteur.email 
            }, 
            status: "notified" 
          });
        }
      } catch (e) {
        console.error("[notify-conducteur] ❌ Exception lors de l'envoi email:", e);
        results.push({ 
          lot: { 
            chantier_id: lot.chantier_id, 
            semaine: lot.semaine, 
            chantier_nom: chantier.nom 
          }, 
          status: "email_error", 
          detail: String(e) 
        });
      }
    }

    const endTime = Date.now();
    const nbSuccess = results.filter(r => r.status === 'notified' || r.status === 'notified_but_update_failed').length;
    const nbEchecs = results.filter(r => !['notified', 'notified_but_update_failed'].includes(r.status)).length;

    console.log(`[notify-conducteur] ✨ Traitement terminé. ${nbSuccess}/${results.length} lot(s) notifié(s) avec succès`);

    // 5) Enregistrer dans rappels_historique
    if (results.length > 0) {
      const { error: histError } = await supabase.from('rappels_historique').insert({
        type: 'notify_conducteur',
        execution_mode: 'cron',
        nb_destinataires: results.length,
        nb_succes: nbSuccess,
        nb_echecs: nbEchecs,
        duration_ms: endTime - startTime,
        details: { lots: results }
      });

      if (histError) {
        console.error("[notify-conducteur] ⚠️ Erreur lors de l'enregistrement dans rappels_historique:", histError);
      } else {
        console.log("[notify-conducteur] 📝 Historique enregistré dans rappels_historique");
      }
    }

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
