import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FicheJour {
  id: string;
  date: string;
  heures: number;
  HNORM: number;
  pause_minutes: number;
  PA: boolean;
  T: number;
  HI: number;
  code_chantier_du_jour?: string | null;
  ville_du_jour?: string | null;
  trajet_perso?: boolean;
  commentaire?: string | null;
  code_trajet?: string | null;
  repas_type?: "PANIER" | "RESTO" | null;
}

export interface MaconWithFiche {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  ficheId?: string;
  signed: boolean;
  isChef?: boolean;
  role?: string;
  totalHeures?: number;
  paniers?: number;
  trajets?: number;
  intemperie?: number;
  ficheJours?: FicheJour[];
}

export const useMaconsByChantier = (chantierId: string | null, semaine: string, chefId?: string) => {
  let entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["macons-chantier", chantierId, semaine, chefId, entrepriseId],
    queryFn: async () => {
      try {
        // Tentative de restauration de l'entrepriseId si manquant
        if (!entrepriseId) {
          console.warn("[useMaconsByChantier] entrepriseId manquant, tentative de restauration...");
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: userRole } = await supabase
              .from("user_roles")
              .select("entreprise_id")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (userRole?.entreprise_id) {
              entrepriseId = userRole.entreprise_id;
              localStorage.setItem("current_entreprise_id", entrepriseId);
              console.log("[useMaconsByChantier] entrepriseId restauré:", entrepriseId);
            }
          }
        }

        if (!chantierId || !entrepriseId) {
          console.warn("[useMaconsByChantier] chantierId ou entrepriseId manquant, retour tableau vide");
          return [];
        }

      const allEmployees: MaconWithFiche[] = [];
      
      // 1. Si un chef est spécifié, l'ajouter en premier
      if (chefId) {
        const { data: chef } = await supabase
          .from("utilisateurs")
          .select("id, nom, prenom, email, agence_interim, role_metier")
          .eq("id", chefId)
          .eq("entreprise_id", entrepriseId)
          .maybeSingle();
        
        // Récupérer le rôle du chef (role_metier pour maçon/grutier/intérimaire)
        let chefRole = "chef";
        if (chef) {
          chefRole = chef.role_metier || "chef";
        }

        if (chef) {
          // Récupérer la fiche du chef pour cette semaine (peu importe le chantier)
          const { data: fichChef } = await supabase
            .from("fiches")
            .select("id, total_heures")
            .eq("salarie_id", chef.id)
            .eq("chantier_id", chantierId)
            .eq("semaine", semaine)
            .maybeSingle();

          // Récupérer les fiches_jours du chef
          let ficheJoursChef: FicheJour[] = [];
          let paniersChef = 0;
          let trajetsChef = 0;
          let intemperieChef = 0;
          
          if (fichChef?.id) {
            const { data: jours } = await supabase
              .from("fiches_jours")
              .select("id, date, heures, HNORM, pause_minutes, PA, T, HI, code_chantier_du_jour, ville_du_jour, trajet_perso, commentaire, code_trajet, repas_type")
              .eq("fiche_id", fichChef.id)
              .order("date");
            
            if (jours) {
              ficheJoursChef = jours.map(j => ({
                id: j.id,
                date: j.date,
                heures: Number(j.heures || 0),
                HNORM: Number(j.HNORM || 0),
                pause_minutes: j.pause_minutes || 0,
                PA: j.PA || false,
                T: Number(j.T || 0),
                HI: Number(j.HI || 0),
                code_chantier_du_jour: j.code_chantier_du_jour || null,
                ville_du_jour: j.ville_du_jour || null,
                trajet_perso: !!j.trajet_perso,
                commentaire: j.commentaire || null,
                code_trajet: j.code_trajet || null,
                repas_type: j.repas_type || null,
              }));
              
              paniersChef = jours.filter(j => j.PA).length;
              trajetsChef = jours.filter(j => j.trajet_perso || (j.code_trajet && j.code_trajet !== '')).length;
              intemperieChef = jours.reduce((sum, j) => sum + Number(j.HI || 0), 0);
            }
          }

          // Vérifier si le chef a signé
          let signedChef = false;
          if (fichChef?.id) {
            const { data: signature } = await supabase
              .from("signatures")
              .select("id")
              .eq("fiche_id", fichChef.id)
              .eq("signed_by", chef.id)
              .maybeSingle();
            
            signedChef = !!signature;
          }

          allEmployees.push({
            id: chef.id,
            nom: chef.nom || "",
            prenom: chef.prenom || "",
            email: chef.email || "",
            ficheId: fichChef?.id,
            signed: signedChef,
            isChef: true,
            role: chefRole,
            totalHeures: Number(fichChef?.total_heures || 0),
            paniers: paniersChef,
            trajets: trajetsChef,
            intemperie: intemperieChef,
            ficheJours: ficheJoursChef,
          });
        }
      }

       // 2. SOURCE UNIQUE D'ÉQUIPE : affectations_jours_chef (mode planning complet)
       // La table affectations (legacy) n'est plus utilisée comme source de vérité.
       // Si aucune donnée n'existe pour une vieille semaine → équipe vide (normal).
       let finalMaconIds: string[] = [];

       let query = supabase
         .from("affectations_jours_chef")
         .select("macon_id")
         .eq("chantier_id", chantierId)
         .eq("semaine", semaine)
         .eq("entreprise_id", entrepriseId);
       
       if (chefId) {
         query = query.eq("chef_id", chefId);
       }
       
       const { data: joursAffectations, error: joursError } = await query;

       if (joursError) {
         console.error("[useMaconsByChantier] Erreur affectations_jours_chef:", joursError);
       }

       // Dédupliquer les macon_id
       finalMaconIds = [...new Set((joursAffectations || []).map(a => a.macon_id))];
       console.log(`[useMaconsByChantier] ${finalMaconIds.length} employés trouvés dans affectations_jours_chef pour semaine ${semaine} (chef: ${chefId || 'tous'})`);

       // Récupérer tous les chef_id connus pour ce chantier/semaine (filet de sécurité)
       const { data: chefIdsData } = await supabase
         .from("affectations_jours_chef")
         .select("chef_id")
         .eq("chantier_id", chantierId)
         .eq("semaine", semaine)
         .eq("entreprise_id", entrepriseId!);

       const knownChefIds = new Set(
         (chefIdsData || []).map(a => a.chef_id)
       );

       // ÉTAPE 3 : Charger les utilisateurs pour ces macon_id (hors chef déjà ajouté)
       // Chaque chef gère ses propres heures indépendamment via sa propre fiche
       const maconIdsToLoad = finalMaconIds.filter(id => id !== chefId);

      if (maconIdsToLoad.length > 0) {
        const { data: macons, error: maconsError } = await supabase
          .from("utilisateurs")
          .select("id, nom, prenom, email, agence_interim, role_metier")
          .in("id", maconIdsToLoad)
          .eq("entreprise_id", entrepriseId);

        if (maconsError) {
          console.error("[useMaconsByChantier] Erreur chargement utilisateurs:", maconsError);
        }

        // Pour chaque maçon, récupérer fiche + signature
        // ✅ CORRECTIF: Filtrer les autres chefs — chaque chef gère ses propres heures
        if (macons) {
          // ✅ CORRECTIF #2: Double filtre — role_metier ET chef_id connus
          // Protège contre les cas où role_metier serait NULL (données legacy)
          const nonChefMacons = macons.filter(m => m.role_metier !== 'chef' && !knownChefIds.has(m.id));
          const maconsWithStatus = await Promise.all(
            nonChefMacons.map(async (macon) => {
              // Récupérer la fiche pour ce maçon cette semaine
              const { data: fiche } = await supabase
                .from("fiches")
                .select("id, total_heures")
                .eq("salarie_id", macon.id)
                .eq("chantier_id", chantierId)
                .eq("semaine", semaine)
                .maybeSingle();

              // Récupérer les fiches_jours
              let ficheJours: FicheJour[] = [];
              let paniers = 0;
              let trajets = 0;
              let intemperie = 0;

              if (fiche?.id) {
                const { data: jours } = await supabase
                  .from("fiches_jours")
                  .select("id, date, heures, HNORM, pause_minutes, PA, T, HI, code_chantier_du_jour, ville_du_jour, trajet_perso, commentaire, code_trajet, repas_type")
                  .eq("fiche_id", fiche.id)
                  .order("date");

                if (jours) {
                  ficheJours = jours.map(j => ({
                    id: j.id,
                    date: j.date,
                    heures: Number(j.heures || 0),
                    HNORM: Number(j.HNORM || 0),
                    pause_minutes: j.pause_minutes || 0,
                    PA: j.PA || false,
                    T: Number(j.T || 0),
                    HI: Number(j.HI || 0),
                    code_chantier_du_jour: j.code_chantier_du_jour || null,
                    ville_du_jour: j.ville_du_jour || null,
                    trajet_perso: !!j.trajet_perso,
                    commentaire: j.commentaire || null,
                    code_trajet: j.code_trajet || null,
                    repas_type: j.repas_type || null,
                  }));

                  paniers = jours.filter(j => j.PA).length;
                  trajets = jours.filter(j => j.trajet_perso || (j.code_trajet && j.code_trajet !== '')).length;
                  intemperie = jours.reduce((sum, j) => sum + Number(j.HI || 0), 0);
                }
              }

              // Vérifier si une signature existe déjà pour cette fiche
              let signed = false;
              if (fiche?.id) {
                const { data: signature } = await supabase
                  .from("signatures")
                  .select("id")
                  .eq("fiche_id", fiche.id)
                  .eq("signed_by", macon.id)
                  .maybeSingle();

                signed = !!signature;
              }

              // Déterminer le rôle basé sur role_metier et agence_interim
              const role = macon.agence_interim ? "interimaire" : (macon.role_metier || "macon");

              return {
                id: macon.id,
                nom: macon.nom || "",
                prenom: macon.prenom || "",
                email: macon.email || "",
                ficheId: fiche?.id,
                signed,
                isChef: false,
                role,
                totalHeures: Number(fiche?.total_heures || 0),
                paniers,
                trajets,
                intemperie,
                ficheJours,
              };
            })
          );

          allEmployees.push(...maconsWithStatus.filter(Boolean) as MaconWithFiche[]);
        }
      }

        return allEmployees;
      } catch (error) {
        console.error("[useMaconsByChantier] Erreur globale:", error);
        return [];
      }
    },
    enabled: !!chantierId && !!semaine,
    refetchOnMount: "always",
    staleTime: 0,
  });
};
