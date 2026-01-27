import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LigneMateriau {
  categorie: string;
  designation: string;
  unite: string;
  quantite: number;
}

interface FicheTransportMateriaux {
  id: string;
  entreprise_id: string;
  chantier_id: string;
  conducteur_id: string;
  semaine_livraison: number;
  jour_livraison: string;
  moyen_transport: string;
  responsable_depot: string | null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ficheId } = await req.json();

    if (!ficheId) {
      return new Response(
        JSON.stringify({ error: "ficheId est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer le client Supabase avec service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer la fiche avec toutes les données
    const { data: fiche, error: ficheError } = await supabase
      .from("fiches_transport_materiaux")
      .select(`
        *,
        chantier:chantiers(nom, code_chantier, ville, adresse, chef:utilisateurs!chantiers_chef_id_fkey(prenom, nom)),
        conducteur:utilisateurs!fiches_transport_materiaux_conducteur_id_fkey(prenom, nom, email),
        lignes:fiches_transport_materiaux_lignes(categorie, designation, unite, quantite)
      `)
      .eq("id", ficheId)
      .single();

    if (ficheError || !fiche) {
      console.error("Erreur récupération fiche:", ficheError);
      return new Response(
        JSON.stringify({ error: "Fiche non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer l'entreprise avec email_depot
    const { data: entreprise, error: entrepriseError } = await supabase
      .from("entreprises")
      .select("nom, email_depot")
      .eq("id", fiche.entreprise_id)
      .single();

    if (entrepriseError || !entreprise) {
      console.error("Erreur récupération entreprise:", entrepriseError);
      return new Response(
        JSON.stringify({ error: "Entreprise non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!entreprise.email_depot) {
      return new Response(
        JSON.stringify({ error: "Email du dépôt non configuré pour cette entreprise" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formater la date de livraison
    const jourLivraison = new Date(fiche.jour_livraison);
    const jourFormate = jourLivraison.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Regrouper les lignes par catégorie
    const lignesParCategorie = (fiche.lignes || []).reduce((acc: Record<string, LigneMateriau[]>, ligne: LigneMateriau) => {
      const cat = ligne.categorie || "Divers";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(ligne);
      return acc;
    }, {});

    // Construire le tableau HTML des matériaux
    let tableauMateriauxHtml = "";
    for (const [categorie, lignes] of Object.entries(lignesParCategorie)) {
      tableauMateriauxHtml += `
        <tr style="background-color: #f3f4f6;">
          <td colspan="4" style="padding: 8px; font-weight: bold; border: 1px solid #e5e7eb;">${categorie}</td>
        </tr>
      `;
      for (const ligne of lignes as LigneMateriau[]) {
        tableauMateriauxHtml += `
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${ligne.designation}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${ligne.unite}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${ligne.quantite}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;"></td>
          </tr>
        `;
      }
    }

    // Construire l'email HTML
    const emailHtml = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Demande de transport matériaux</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📦 Demande de Transport Matériaux</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Semaine ${fiche.semaine_livraison}</p>
      </div>
      
      <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        
        <h2 style="color: #ea580c; font-size: 18px; margin-top: 0;">📍 Informations de livraison</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; width: 30%; background: #f9fafb; font-weight: bold;">Chantier</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${fiche.chantier?.code_chantier || ""} - ${fiche.chantier?.nom || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Ville</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${fiche.chantier?.ville || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Adresse</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${fiche.chantier?.adresse || "—"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Chef de chantier</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${fiche.chantier?.chef ? `${fiche.chantier.chef.prenom} ${fiche.chantier.chef.nom}` : "—"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Conducteur</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${fiche.conducteur?.prenom || ""} ${fiche.conducteur?.nom || ""}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Jour de livraison</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; color: #ea580c;">${jourFormate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Moyen de transport</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${fiche.moyen_transport || "—"}</td>
          </tr>
          ${fiche.responsable_depot ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Responsable dépôt</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${fiche.responsable_depot}</td>
          </tr>
          ` : ""}
        </table>
        
        <h2 style="color: #ea580c; font-size: 18px;">📋 Liste des matériaux</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #ea580c; color: white;">
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Désignation</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; width: 80px;">Unité</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; width: 80px;">Quantité</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; width: 100px;">Réel chargé</th>
            </tr>
          </thead>
          <tbody>
            ${tableauMateriauxHtml}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; padding: 15px; background: #fef3cd; border: 1px solid #ffc107; border-radius: 6px;">
          <p style="margin: 0; font-size: 14px;">
            <strong>⚠️ Merci de compléter la colonne "Réel chargé" avant le départ du camion.</strong>
          </p>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          Cette demande a été générée automatiquement par l'application DIVA - ${entreprise.nom}
        </p>
      </div>
    </body>
    </html>
    `;

    // Envoyer l'email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY non configurée" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const emailResult = await resend.emails.send({
      from: "Transport DIVA <rappels-diva-LR@groupe-engo.com>",
      to: [entreprise.email_depot],
      subject: `📦 Demande transport matériaux - ${fiche.chantier?.nom || "Chantier"} - S${fiche.semaine_livraison}`,
      html: emailHtml,
      reply_to: fiche.conducteur?.email || undefined,
    });

    console.log("Email envoyé:", emailResult);

    // Marquer la fiche comme transmise
    const { error: updateError } = await supabase
      .from("fiches_transport_materiaux")
      .update({
        statut: "TRANSMISE",
        transmise_at: new Date().toISOString(),
      })
      .eq("id", ficheId);

    if (updateError) {
      console.error("Erreur mise à jour statut:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erreur send-transport-materiaux:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
