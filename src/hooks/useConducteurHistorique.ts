import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FicheJourHistorique {
  date: string;
  heures: number;
  HNORM: number;
  HI: number;
  PA: boolean;
  T: number;
  code_trajet: string | null;
  code_chantier_du_jour: string | null;
  ville_du_jour: string | null;
}

export interface FinisseurHistorique {
  id: string;
  nom: string;
  prenom: string;
  totalHeures: number;
  totalIntemperie: number;
  paniers: number;
  trajets: number;
  ficheJours: FicheJourHistorique[];
  transportJours: TransportJourHistorique[];
}

export interface TransportJourHistorique {
  date: string;
  immatriculation: string | null;
  conducteurMatinNom: string | null;
  conducteurSoirNom: string | null;
  trajet_perso?: boolean;
}

export interface SemaineHistorique {
  semaine: string;
  dateTransmission: string;
  statut: string;
  finisseurs: FinisseurHistorique[];
}

export const useConducteurHistorique = (conducteurId: string | null) => {
  return useQuery({
    queryKey: ["conducteur-historique", conducteurId],
    queryFn: async (): Promise<SemaineHistorique[]> => {
      if (!conducteurId) return [];

      console.log("[Historique] Chargement pour conducteurId:", conducteurId);

      // 🔥 NOUVELLE LOGIQUE: Récupérer les affectations du conducteur pour identifier ses finisseurs
      const { data: affectations, error: affectationsError } = await supabase
        .from("affectations_finisseurs_jours")
        .select("finisseur_id, semaine, date, chantier_id")
        .eq("conducteur_id", conducteurId);

      if (affectationsError) throw affectationsError;
      if (!affectations || affectations.length === 0) {
        console.log("[Historique] Aucune affectation trouvée");
        return [];
      }

      // Grouper par finisseur et semaine pour récupérer les fiches
      const finisseursSemaines = new Map<string, Set<string>>();
      // 🔥 FIX Bug 2: clé scopée par chantier pour éviter le mélange multi-chantier
      const affectationDates = new Map<string, Set<string>>(); // key: "finisseurId_semaine_chantierId"
      
      affectations.forEach(aff => {
        if (!finisseursSemaines.has(aff.finisseur_id)) {
          finisseursSemaines.set(aff.finisseur_id, new Set());
        }
        finisseursSemaines.get(aff.finisseur_id)!.add(aff.semaine);
        
        // 🔥 FIX: inclure chantier_id dans la clé pour scoper par chantier
        const key = `${aff.finisseur_id}_${aff.semaine}_${aff.chantier_id}`;
        if (!affectationDates.has(key)) {
          affectationDates.set(key, new Set());
        }
        affectationDates.get(key)!.add(aff.date);
      });

      // 🔥 Récupérer les trajets perso du conducteur (il est son propre finisseur)
      const { data: fichesConducteurPerso, error: fichesPersoError } = await supabase
        .from("fiches_jours")
        .select(`
          date,
          fiche_id,
          trajet_perso,
          fiches!inner(
            semaine,
            salarie_id,
            statut,
            chantier_id
          )
        `)
        .eq("fiches.salarie_id", conducteurId)
        .eq("trajet_perso", true)
        .in("fiches.statut", ["ENVOYE_RH", "AUTO_VALIDE"]);

      if (fichesPersoError) throw fichesPersoError;

      // Fusionner les trajets perso dans les données
      fichesConducteurPerso?.forEach(jour => {
        const fiche = jour.fiches as any;
        const finisseurId = conducteurId;
        const semaine = fiche.semaine;
        
        if (!finisseursSemaines.has(finisseurId)) {
          finisseursSemaines.set(finisseurId, new Set());
        }
        finisseursSemaines.get(finisseurId)!.add(semaine);
        
        // 🔥 FIX: inclure chantier_id dans la clé pour les trajets perso
        const key = `${finisseurId}_${semaine}_${fiche.chantier_id}`;
        if (!affectationDates.has(key)) {
          affectationDates.set(key, new Set());
        }
        affectationDates.get(key)!.add(jour.date);
      });

      const finisseurIds = Array.from(finisseursSemaines.keys());

      // ✅ CORRECTION : Récupérer toutes les fiches ENVOYE_RH ou AUTO_VALIDE pour ces finisseurs
      // Règle métier : chaque fiche a obligatoirement un chantier_id
      const { data: fiches, error: fichesError } = await supabase
        .from("fiches")
        .select(`
          id,
          semaine,
          statut,
          updated_at,
          salarie_id,
          chantier_id,
          utilisateurs!fiches_salarie_id_fkey(id, nom, prenom)
        `)
        .in("salarie_id", finisseurIds)
        .in("statut", ["ENVOYE_RH", "AUTO_VALIDE"])
        .order("semaine", { ascending: false });

      if (fichesError) throw fichesError;
      if (!fiches || fiches.length === 0) {
        console.log("[Historique] Aucune fiche trouvée");
        return [];
      }

      console.log("[Historique] Fiches trouvées:", fiches.length);

      // Grouper par semaine
      const semaines = new Map<string, SemaineHistorique>();

      for (const fiche of fiches) {
        if (!fiche.semaine || !fiche.salarie_id) continue;

        // Vérifier que ce conducteur a bien affecté ce finisseur cette semaine sur ce chantier
        const key = `${fiche.salarie_id}_${fiche.semaine}_${fiche.chantier_id}`;
        if (!affectationDates.has(key)) continue; // Ce conducteur n'a pas affecté ce finisseur cette semaine sur ce chantier

        if (!semaines.has(fiche.semaine)) {
          semaines.set(fiche.semaine, {
            semaine: fiche.semaine,
            dateTransmission: fiche.updated_at,
            statut: fiche.statut,
            finisseurs: [],
          });
        }

        // 🔥 Récupérer UNIQUEMENT les jours affectés par ce conducteur sur ce chantier
        const datesAffectees = Array.from(affectationDates.get(key) ?? new Set<string>());
        const { data: ficheJours, error: joursError } = await supabase
          .from("fiches_jours")
          .select("date, heures, HNORM, HI, PA, T, code_trajet, code_chantier_du_jour, ville_du_jour, trajet_perso")
          .eq("fiche_id", fiche.id)
          .in("date", datesAffectees)
          .order("date");

        if (joursError) throw joursError;

        console.log(`[Historique] Finisseur ${fiche.salarie_id}: ${ficheJours?.length || 0} jours affectés par conducteur ${conducteurId}`);

        // Calculer les totaux sur TOUS les jours (pas uniquement les affectations)
        // 🔥 PRIORITÉ: heures (champ calculé après pause) puis HNORM (cohérent avec RH)
        const totalHeures = ficheJours?.reduce((sum, j) => {
          const heures = Number(j.heures) || Number(j.HNORM) || 0;
          return sum + heures;
        }, 0) || 0;

        const totalIntemperie = ficheJours?.reduce((sum, j) => sum + (Number(j.HI) || 0), 0) || 0;

        // Paniers: compter les jours où PA = true
        const paniers = ficheJours?.filter((j) => j.PA === true).length || 0;

        // Trajets: somme de T (avec fallback à 1 si T est null/undefined mais qu'il y a des heures)
        const trajets = ficheJours?.reduce((sum, j) => {
          const t = j.T !== null && j.T !== undefined ? Number(j.T) : 1;
          return sum + t;
        }, 0) || 0;

        console.log(`[Historique] ${fiche.salarie_id}: ${totalHeures}h, ${paniers} paniers, ${trajets} trajets`);

        // 🔥 NOUVEAU SYSTÈME UNIFIÉ: Charger depuis fiches_transport + fiches_transport_jours
        const datesSet = new Set(datesAffectees);
        let transportJours: TransportJourHistorique[] = [];

        // Récupérer la fiche transport unifiée par chantier + semaine
        const { data: transportFiche } = await supabase
          .from("fiches_transport")
          .select("id")
          .eq("chantier_id", fiche.chantier_id)
          .eq("semaine", fiche.semaine)
          .maybeSingle();

        if (transportFiche) {
          console.log(`[Historique] Transport unifié trouvé: ${transportFiche.id} pour chantier ${fiche.chantier_id}`);

          // 🔥 FIX Bug 1: ajouter "periode" dans le select pour fusionner MATIN+SOIR
          const { data: joursAll } = await supabase
            .from("fiches_transport_jours")
            .select(`
              date,
              periode,
              immatriculation,
              conducteur_aller:utilisateurs!fiches_transport_jours_conducteur_aller_id_fkey(id, nom, prenom),
              conducteur_retour:utilisateurs!fiches_transport_jours_conducteur_retour_id_fkey(id, nom, prenom)
            `)
            .eq("fiche_transport_id", transportFiche.id)
            .order("date");

          // 🔥 FIX Bug 1: Fusionner les lignes MATIN + SOIR par date en une seule entrée
          const byDate = new Map<string, { date: string; immatriculation: string | null; conducteur_aller: any; conducteur_retour: any }>();
          (joursAll || []).forEach((j: any) => {
            if (!byDate.has(j.date)) {
              byDate.set(j.date, { date: j.date, immatriculation: null, conducteur_aller: null, conducteur_retour: null });
            }
            const entry = byDate.get(j.date)!;
            if (j.periode === "MATIN") {
              entry.conducteur_aller = j.conducteur_aller;
              entry.immatriculation = j.immatriculation || entry.immatriculation;
            } else if (j.periode === "SOIR") {
              entry.conducteur_retour = j.conducteur_retour;
              entry.immatriculation = entry.immatriculation || j.immatriculation;
            } else {
              // Fallback si pas de période: remplir ce qui manque
              if (!entry.conducteur_aller) entry.conducteur_aller = j.conducteur_aller;
              if (!entry.conducteur_retour) entry.conducteur_retour = j.conducteur_retour;
              entry.immatriculation = entry.immatriculation || j.immatriculation;
            }
          });

          // Filtrer par dates affectées à ce finisseur (scopées au bon chantier)
          const joursFiltres = Array.from(byDate.values()).filter(j => datesSet.has(j.date));

          console.log(`[Historique] Transport ${fiche.salarie_id}: ${joursFiltres.length}/${datesAffectees.length} jours consolidés`);

          // Créer des placeholders pour les jours manquants
          const filteredDatesSet = new Set(joursFiltres.map(j => j.date));
          const missingDates = datesAffectees.filter(d => !filteredDatesSet.has(d));
          
          if (missingDates.length > 0) {
            console.log(`[Historique] Dates manquantes pour ${fiche.salarie_id}:`, missingDates);
          }

          const placeholders = missingDates.map(d => ({
            date: d,
            immatriculation: null,
            conducteur_aller: null,
            conducteur_retour: null,
          }));

          // Combiner jours réels + placeholders et trier
          const joursAffectes = [...joursFiltres, ...placeholders].sort((a, b) => 
            a.date.localeCompare(b.date)
          );

          // Trouver les jours avec trajet_perso
          const joursPersoSet = new Set(
            ficheJours?.filter(j => j.trajet_perso === true).map(j => j.date) || []
          );

          transportJours = joursAffectes.map((j: any) => ({
            date: j.date,
            immatriculation: j.immatriculation || null,
            conducteurMatinNom: j.conducteur_aller
              ? `${j.conducteur_aller.prenom} ${j.conducteur_aller.nom}`
              : null,
            conducteurSoirNom: j.conducteur_retour
              ? `${j.conducteur_retour.prenom} ${j.conducteur_retour.nom}`
              : null,
            trajet_perso: joursPersoSet.has(j.date),
          }));
        } else {
          console.log(`[Historique] Aucune fiche transport unifiée pour chantier ${fiche.chantier_id} - création de placeholders`);
          
          // Si aucune fiche transport, créer des placeholders pour tous les jours affectés
          const joursPersoSet = new Set(
            ficheJours?.filter(j => j.trajet_perso === true).map(j => j.date) || []
          );
          
          transportJours = datesAffectees.map(date => ({
            date,
            immatriculation: null,
            conducteurMatinNom: null,
            conducteurSoirNom: null,
            trajet_perso: joursPersoSet.has(date),
          }));
        }

        const utilisateur = fiche.utilisateurs as any;
        semaines.get(fiche.semaine)!.finisseurs.push({
          id: fiche.salarie_id!,
          nom: utilisateur?.nom || "",
          prenom: utilisateur?.prenom || "",
          totalHeures,
          totalIntemperie,
          paniers,
          trajets,
          ficheJours: ficheJours || [],
          transportJours,
        });
      }

      console.log("[Historique] Semaines trouvées:", semaines.size);
      return Array.from(semaines.values());
    },
    enabled: !!conducteurId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
