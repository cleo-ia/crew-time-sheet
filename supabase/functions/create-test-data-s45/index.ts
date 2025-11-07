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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log("🚀 Début création jeu de données test S45");

    // 1. Récupérer ou créer le conducteur test (via user_roles)
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "conducteur")
      .limit(1)
      .single();

    let conducteur;
    if (!userRoles) {
      console.log("⚠️ Aucun conducteur trouvé, création d'un conducteur test...");
      
      const conducteurId = crypto.randomUUID();
      const conducteurTest = {
        id: conducteurId,
        prenom: "Conducteur",
        nom: "Test",
        email: `conducteur.test.${Date.now()}@groupe-engo.com`,
      };

      // Créer l'utilisateur
      const { error: insertError } = await supabase
        .from("utilisateurs")
        .insert(conducteurTest);

      if (insertError) throw insertError;

      // Créer le rôle conducteur
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: conducteurId,
          role: "conducteur",
        });

      if (roleError) throw roleError;

      conducteur = conducteurTest;
      console.log(`✅ Conducteur test créé: ${conducteur.prenom} ${conducteur.nom}`);
    } else {
      // Récupérer les infos du conducteur
      const { data: conducteurData } = await supabase
        .from("utilisateurs")
        .select("id, prenom, nom, email")
        .eq("id", userRoles.user_id)
        .single();
      
      conducteur = conducteurData;
      if (conducteur) {
        console.log(`✅ Conducteur: ${conducteur.prenom} ${conducteur.nom} (${conducteur.id})`);
      }
    }

    if (!conducteur) {
      throw new Error("Impossible de créer ou récupérer un conducteur");
    }

    // 2. Récupérer ou créer des finisseurs
    let { data: finisseurs } = await supabase
      .from("utilisateurs")
      .select("id, prenom, nom, email")
      .eq("role_metier", "finisseur")
      .limit(3);

    if (!finisseurs || finisseurs.length === 0) {
      console.log("⚠️ Aucun finisseur trouvé, création de finisseurs test...");
      
      const finisseursTest = [
        { id: crypto.randomUUID(), prenom: "Jean", nom: "Dupont", email: "jean.dupont.test@groupe-engo.com", role_metier: "finisseur" },
        { id: crypto.randomUUID(), prenom: "Marie", nom: "Martin", email: "marie.martin.test@groupe-engo.com", role_metier: "finisseur" },
        { id: crypto.randomUUID(), prenom: "Pierre", nom: "Durand", email: "pierre.durand.test@groupe-engo.com", role_metier: "finisseur" },
      ];

      const { error: insertError } = await supabase
        .from("utilisateurs")
        .insert(finisseursTest);

      if (insertError) throw insertError;

      finisseurs = finisseursTest;
      console.log(`✅ ${finisseurs.length} finisseurs créés`);
    } else {
      console.log(`✅ ${finisseurs.length} finisseurs existants utilisés`);
    }

    // 3. Récupérer un chantier test
    const { data: chantiers } = await supabase
      .from("chantiers")
      .select("id, nom, code_chantier, ville")
      .eq("actif", true)
      .limit(1);

    if (!chantiers || chantiers.length === 0) {
      throw new Error("Aucun chantier actif trouvé");
    }

    const chantier = chantiers[0];
    console.log(`✅ Chantier: ${chantier.nom} (${chantier.code_chantier})`);

    // 4. Dates de la semaine S45
    const dates = [
      "2025-11-03", // Lundi
      "2025-11-04", // Mardi
      "2025-11-05", // Mercredi
      "2025-11-06", // Jeudi
      "2025-11-07", // Vendredi
    ];

    // 5. Créer affectations pour chaque finisseur
    const affectations = [];
    for (const finisseur of finisseurs) {
      for (const date of dates) {
        affectations.push({
          finisseur_id: finisseur.id,
          conducteur_id: conducteur.id,
          chantier_id: chantier.id,
          date,
          semaine: "2025-S45",
        });
      }
    }

    const { error: affError } = await supabase
      .from("affectations_finisseurs_jours")
      .insert(affectations);

    if (affError) throw affError;
    console.log(`✅ ${affectations.length} affectations créées`);

    // 6. Créer les fiches + fiches_jours pour chaque finisseur
    const fichesCreees = [];
    for (const finisseur of finisseurs) {
      // Créer la fiche
      const { data: fiche, error: ficheError } = await supabase
        .from("fiches")
        .insert({
          semaine: "2025-S45",
          salarie_id: finisseur.id,
          user_id: conducteur.id,
          chantier_id: null,
          statut: "ENVOYE_RH",
          total_heures: 35,
        })
        .select()
        .single();

      if (ficheError) throw ficheError;
      fichesCreees.push(fiche);

      // Créer les fiches_jours (7h par jour)
      const fichesJours = dates.map(date => ({
        fiche_id: fiche.id,
        date,
        heures: 7,
        HNORM: 7,
        HI: 0,
        T: 1,
        PA: true,
        trajet_perso: false,
        pause_minutes: 0,
        code_chantier_du_jour: chantier.code_chantier,
        ville_du_jour: chantier.ville,
      }));

      const { error: joursError } = await supabase
        .from("fiches_jours")
        .insert(fichesJours);

      if (joursError) throw joursError;

      console.log(`✅ Fiche + 5 jours créés pour ${finisseur.prenom} ${finisseur.nom}`);
    }

    // 7. Créer les fiches de transport finisseurs
    for (let i = 0; i < finisseurs.length; i++) {
      const finisseur = finisseurs[i];
      const fiche = fichesCreees[i];

      // Créer la fiche transport
      const { data: transport, error: transportError } = await supabase
        .from("fiches_transport_finisseurs")
        .insert({
          fiche_id: fiche.id,
          finisseur_id: finisseur.id,
          semaine: "2025-S45",
        })
        .select()
        .single();

      if (transportError) throw transportError;

      // Créer les jours de transport
      const transportJours = dates.map(date => ({
        fiche_transport_finisseur_id: transport.id,
        date,
        conducteur_matin_id: conducteur.id,
        conducteur_soir_id: conducteur.id,
        immatriculation: `TEST-${i + 1}`,
      }));

      const { error: joursError } = await supabase
        .from("fiches_transport_finisseurs_jours")
        .insert(transportJours);

      if (joursError) throw joursError;

      console.log(`✅ Fiche transport créée pour ${finisseur.prenom} ${finisseur.nom}`);
    }

    // 8. Créer les signatures (finisseur + conducteur)
    const signatures = [];
    for (const fiche of fichesCreees) {
      // Signature finisseur
      signatures.push({
        fiche_id: fiche.id,
        signed_by: fiche.salarie_id,
        role: "finisseur",
        signature_data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      });

      // Signature conducteur
      signatures.push({
        fiche_id: fiche.id,
        signed_by: conducteur.id,
        role: "conducteur",
        signature_data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      });
    }

    const { error: sigError } = await supabase
      .from("signatures")
      .insert(signatures);

    if (sigError) throw sigError;
    console.log(`✅ ${signatures.length} signatures créées`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Jeu de données test S45 créé avec succès",
        data: {
          conducteur: { id: conducteur.id, nom: `${conducteur.prenom} ${conducteur.nom}` },
          finisseurs: finisseurs.map(f => ({ id: f.id, nom: `${f.prenom} ${f.nom}` })),
          chantier: { id: chantier.id, nom: chantier.nom },
          stats: {
            affectations: affectations.length,
            fiches: fichesCreees.length,
            fiches_jours: fichesCreees.length * 5,
            fiches_transport: finisseurs.length,
            transport_jours: finisseurs.length * 5,
            signatures: signatures.length,
          },
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("❌ Erreur:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
