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
    // Lire les paramètres optionnels du body pour mode ciblé
    let targetChantierId: string | null = null;
    let targetSemaine: string | null = null;
    
    try {
      const body = await req.json();
      targetChantierId = body?.chantierId || null;
      targetSemaine = body?.semaine || null;
    } catch {
      // Pas de body ou body invalide - mode scan global (CRON)
    }

    const isTargetedMode = !!(targetChantierId && targetSemaine);
    console.log(`[notify-conducteur] 🚀 Mode: ${isTargetedMode ? 'CIBLÉ' : 'SCAN GLOBAL'}`);
    
    if (isTargetedMode) {
      console.log(`[notify-conducteur] 🎯 Cible: chantier=${targetChantierId}, semaine=${targetSemaine}`);
    }

    // 1) Récupérer les lots prêts depuis la vue v_lots_pret_conducteur
    let query = supabase
      .from("v_lots_pret_conducteur")
      .select("chantier_id, semaine, nb_prets, chef_id, conducteur_id")
      .eq("nb_non_prets", 0)
      .gt("nb_prets", 0)
      .is("notif_exists", null);
    
    // Si mode ciblé, filtrer sur le lot spécifique
    if (isTargetedMode) {
      query = query
        .eq("chantier_id", targetChantierId)
        .eq("semaine", targetSemaine);
    }
    
    const { data: lotsView, error: viewError } = await query;

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
    let totalEmailsSent = 0;
    let totalEmailsFailed = 0;

    // 2) Pour chaque lot, enrichir les données et notifier TOUS les conducteurs
    for (const lot of lotsView) {
      console.log(`[notify-conducteur] 🔍 Traitement du lot: ${lot.semaine} / Chantier ID: ${lot.chantier_id}`);

      // Récupérer les infos du chantier avec entreprise_id
      const { data: chantier, error: chantierError } = await supabase
        .from("chantiers")
        .select("nom, code_chantier, ville, entreprise_id")
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

      // Récupérer TOUS les conducteurs de l'entreprise
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "conducteur")
        .eq("entreprise_id", chantier.entreprise_id);

      if (rolesError || !rolesData || rolesData.length === 0) {
        console.error(`[notify-conducteur] ⚠️ Aucun conducteur trouvé pour l'entreprise ${chantier.entreprise_id}:`, rolesError);
        results.push({ 
          lot: { chantier_id: lot.chantier_id, semaine: lot.semaine }, 
          status: "no_conducteurs_found" 
        });
        continue;
      }

      const conducteurIds = rolesData.map(r => r.user_id);

      // Récupérer les infos des conducteurs via utilisateurs
      const { data: conducteurs, error: conducteursError } = await supabase
        .from("utilisateurs")
        .select("id, email, prenom, nom")
        .in("auth_user_id", conducteurIds);

      if (conducteursError || !conducteurs || conducteurs.length === 0) {
        console.error(`[notify-conducteur] ⚠️ Impossible de récupérer les conducteurs:`, conducteursError);
        results.push({ 
          lot: { chantier_id: lot.chantier_id, semaine: lot.semaine }, 
          status: "conducteurs_fetch_error" 
        });
        continue;
      }

      // Filtrer les conducteurs avec email
      const conducteursWithEmail = conducteurs.filter(c => c.email);
      console.log(`[notify-conducteur] 👥 ${conducteursWithEmail.length} conducteur(s) avec email trouvé(s) pour l'entreprise`);

      // Récupérer les infos du chef
      const { data: chef } = await supabase
        .from("utilisateurs")
        .select("prenom, nom")
        .eq("id", lot.chef_id)
        .maybeSingle();

      const chefNomComplet = chef ? `${chef.prenom || ''} ${chef.nom || ''}`.trim() : 'Le chef d\'équipe';

      // Envoyer l'email à CHAQUE conducteur
      const lotEmailResults: any[] = [];

      for (const conducteur of conducteursWithEmail) {
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

        console.log(`[notify-conducteur] 📧 Envoi email à ${conducteur.email} pour: ${chantier.nom} - ${lot.semaine}`);

        try {
          const emailResponse = await resend.emails.send({
            from: 'DIVA Rappels <rappels-diva-LR@groupe-engo.com>',
            to: [conducteur.email],
            subject: `${lot.nb_prets} fiche(s) transmise(s) - ${chantier.nom} (${lot.semaine})`,
            html: emailHtml,
          });

          console.log(`[notify-conducteur] ✅ Email envoyé à ${conducteur.email}:`, emailResponse);
          totalEmailsSent++;
          lotEmailResults.push({ 
            conducteur_email: conducteur.email, 
            status: "sent" 
          });
        } catch (e) {
          console.error(`[notify-conducteur] ❌ Erreur envoi email à ${conducteur.email}:`, e);
          totalEmailsFailed++;
          lotEmailResults.push({ 
            conducteur_email: conducteur.email, 
            status: "error", 
            detail: String(e) 
          });
        }
      }

      // Marquer le lot comme notifié (anti-doublon) - une seule fois pour le lot
      const { error: updErr } = await supabase
        .from("fiches")
        .update({ notification_conducteur_envoyee_at: new Date().toISOString() })
        .eq("chantier_id", lot.chantier_id)
        .eq("semaine", lot.semaine)
        .is("notification_conducteur_envoyee_at", null);

      if (updErr) {
        console.error("[notify-conducteur] ⚠️ Erreur lors de la mise à jour du flag de notification:", updErr);
      } else {
        console.log(`[notify-conducteur] 🎯 Lot marqué comme notifié: ${lot.semaine}`);
      }

      results.push({ 
        lot: { 
          chantier_id: lot.chantier_id, 
          semaine: lot.semaine, 
          chantier_nom: chantier.nom,
          nb_conducteurs: conducteursWithEmail.length
        }, 
        status: "processed",
        emails: lotEmailResults
      });
    }

    const endTime = Date.now();

    console.log(`[notify-conducteur] ✨ Traitement terminé. ${totalEmailsSent} email(s) envoyé(s), ${totalEmailsFailed} échec(s)`);

    // 5) Enregistrer dans rappels_historique
    if (results.length > 0) {
      const { error: histError } = await supabase.from('rappels_historique').insert({
        type: 'notify_conducteur',
        execution_mode: 'cron',
        nb_destinataires: totalEmailsSent + totalEmailsFailed,
        nb_succes: totalEmailsSent,
        nb_echecs: totalEmailsFailed,
        duration_ms: endTime - startTime,
        details: { lots: results }
      });

      if (histError) {
        console.error("[notify-conducteur] ⚠️ Erreur lors de l'enregistrement dans rappels_historique:", histError);
      } else {
        console.log("[notify-conducteur] 📝 Historique enregistré dans rappels_historique");
      }
    }

    return new Response(JSON.stringify({ ok: true, totalEmailsSent, totalEmailsFailed, results }), {
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
