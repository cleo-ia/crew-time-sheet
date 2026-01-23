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
        .select("finisseur_id, semaine, date")
        .eq("conducteur_id", conducteurId);

      if (affectationsError) throw affectationsError;
      if (!affectations || affectations.length === 0) {
        console.log("[Historique] Aucune affectation trouvée");
        return [];
      }

      // Grouper par finisseur et semaine pour récupérer les fiches
      const finisseursSemaines = new Map<string, Set<string>>();
      const affectationDates = new Map<string, Set<string>>(); // key: "finisseurId_semaine"
      
      affectations.forEach(aff => {
        if (!finisseursSemaines.has(aff.finisseur_id)) {
          finisseursSemaines.set(aff.finisseur_id, new Set());
        }
        finisseursSemaines.get(aff.finisseur_id)!.add(aff.semaine);
        
        const key = `${aff.finisseur_id}_${aff.semaine}`;
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
            statut
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
        
        const key = `${finisseurId}_${semaine}`;
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

        // Vérifier que ce conducteur a bien affecté ce finisseur cette semaine
        const key = `${fiche.salarie_id}_${fiche.semaine}`;
        if (!affectationDates.has(key)) continue; // Ce conducteur n'a pas affecté ce finisseur cette semaine

        if (!semaines.has(fiche.semaine)) {
          semaines.set(fiche.semaine, {
            semaine: fiche.semaine,
            dateTransmission: fiche.updated_at,
            statut: fiche.statut,
            finisseurs: [],
          });
        }

        // 🔥 Récupérer UNIQUEMENT les jours affectés par ce conducteur
        const datesAffectees = Array.from(affectationDates.get(key)!);
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

        // 🔥 RÉSOLUTION ROBUSTE DE LA FICHE TRANSPORT
        const datesSet = new Set(datesAffectees);
        
        // Tentative 1: chercher par fiche_id + finisseur_id
        let { data: transportFiche } = await supabase
          .from("fiches_transport_finisseurs")
          .select("id")
          .eq("fiche_id", fiche.id)
          .eq("finisseur_id", fiche.salarie_id)
          .maybeSingle();

        // Fallback: chercher par finisseur_id + semaine si pas trouvé
        if (!transportFiche) {
          const { data: transportFicheFallback } = await supabase
            .from("fiches_transport_finisseurs")
            .select("id")
            .eq("finisseur_id", fiche.salarie_id)
            .eq("semaine", fiche.semaine)
            .maybeSingle();
          transportFiche = transportFicheFallback;
        }

        let transportJours: TransportJourHistorique[] = [];

        if (transportFiche) {
          console.log(`[Historique] Transport fiche trouvée: ${transportFiche.id} pour finisseur ${fiche.salarie_id}`);

          // Récupérer TOUS les jours de transport (pas de filtre SQL sur dates)
          const { data: joursAll } = await supabase
            .from("fiches_transport_finisseurs_jours")
            .select(`
              date,
              immatriculation,
              conducteur_matin_id,
              conducteur_soir_id
            `)
            .eq("fiche_transport_finisseur_id", transportFiche.id)
            .order("date");

          // Filtrer en mémoire par dates affectées
          const joursFiltres = (joursAll || []).filter(j => datesSet.has(j.date));

          console.log(`[Historique] Transport ${fiche.salarie_id}: ${joursFiltres.length}/${datesAffectees.length} jours trouvés`);

          // Créer des placeholders pour les jours manquants
          const filteredDatesSet = new Set(joursFiltres.map(j => j.date));
          const missingDates = datesAffectees.filter(d => !filteredDatesSet.has(d));
          
          if (missingDates.length > 0) {
            console.log(`[Historique] Dates manquantes pour ${fiche.salarie_id}:`, missingDates);
          }

          const placeholders = missingDates.map(d => ({
            date: d,
            immatriculation: null,
            conducteur_matin_id: null,
            conducteur_soir_id: null,
          }));

          // Combiner jours réels + placeholders et trier
          const joursAffectes = [...joursFiltres, ...placeholders].sort((a, b) => 
            a.date.localeCompare(b.date)
          );

          // Récupérer les noms des conducteurs (uniquement pour ceux qui existent)
          const conducteurIds = [
            ...new Set([
              ...joursFiltres.map((j: any) => j.conducteur_matin_id).filter(Boolean),
              ...joursFiltres.map((j: any) => j.conducteur_soir_id).filter(Boolean),
            ]),
          ] as string[];

          let conducteursMap = new Map();
          if (conducteurIds.length > 0) {
            const { data: conducteurs } = await supabase
              .from("utilisateurs")
              .select("id, nom, prenom")
              .in("id", conducteurIds);

            conducteursMap = new Map(
              conducteurs?.map((c) => [c.id, `${c.prenom} ${c.nom}`]) || []
            );
          }

          // Trouver les jours avec trajet_perso
          const joursPersoSet = new Set(
            ficheJours?.filter(j => j.trajet_perso === true).map(j => j.date) || []
          );

          transportJours = joursAffectes.map((j: any) => ({
            date: j.date,
            immatriculation: j.immatriculation || null,
            conducteurMatinNom: j.conducteur_matin_id
              ? conducteursMap.get(j.conducteur_matin_id) || null
              : null,
            conducteurSoirNom: j.conducteur_soir_id
              ? conducteursMap.get(j.conducteur_soir_id) || null
              : null,
            trajet_perso: joursPersoSet.has(j.date),
          }));
        } else {
          console.log(`[Historique] Aucune fiche transport trouvée pour ${fiche.salarie_id} - création de placeholders`);
          
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
  });
};
