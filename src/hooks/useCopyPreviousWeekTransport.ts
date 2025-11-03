import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransportDayV2, TransportVehicle } from "@/types/transport";
import { format, addDays, subWeeks } from "date-fns";
import { parseISOWeek } from "@/lib/weekUtils";

interface CopyTransportParams {
  currentWeek: string;      // ex: "2025-S43"
  chefId: string;
  chantierId: string | null;
  currentFicheId: string | null;
  hasExistingData: boolean;
  onDataLoaded: (days: TransportDayV2[]) => void;
}

export const useCopyPreviousWeekTransport = (params: CopyTransportParams) => {
  const { currentWeek, chefId, chantierId, currentFicheId, hasExistingData, onDataLoaded } = params;

  // Ref pour éviter les appels multiples
  const hasCalledOnDataLoaded = useRef(false);

  // Réinitialiser le flag lors du changement de semaine
  useEffect(() => {
    hasCalledOnDataLoaded.current = false;
  }, [currentWeek]);

  // Calculer la semaine précédente
  const previousWeek = format(subWeeks(parseISOWeek(currentWeek), 1), "RRRR-'S'II");

  // Charger les données de la semaine précédente
  const { data: previousTransport, refetch } = useQuery({
    queryKey: ["copy-previous-transport", previousWeek, chefId, chantierId],
    queryFn: async () => {
      // 1. Trouver la fiche de la semaine précédente
      let query = supabase
        .from("fiches")
        .select("id")
        .eq("semaine", previousWeek)
        .eq("user_id", chefId);

      if (chantierId) {
        query = query.eq("chantier_id", chantierId);
      } else {
        query = query.is("chantier_id", null);
      }

      const { data: previousFiche } = await query
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!previousFiche) return null;

      // 2. Charger la fiche transport de S-1
      const { data: transport } = await supabase
        .from("fiches_transport")
        .select("id")
        .eq("fiche_id", previousFiche.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!transport) return null;

      // 3. Charger les jours/véhicules
      const { data: jours } = await supabase
        .from("fiches_transport_jours")
        .select(`
          *,
          conducteur_aller:utilisateurs!fiches_transport_jours_conducteur_aller_id_fkey(id, nom, prenom),
          conducteur_retour:utilisateurs!fiches_transport_jours_conducteur_retour_id_fkey(id, nom, prenom)
        `)
        .eq("fiche_transport_id", transport.id)
        .order("date")
        .order("periode");

      return jours || [];
    },
    enabled: false, // Désactiver la copie automatique
  });

  // Transformer et transmettre les données
  useEffect(() => {
    if (!previousTransport || previousTransport.length === 0) return;
    if (hasCalledOnDataLoaded.current) return; // Empêcher les appels multiples

    // Grouper par date + véhicule
    const daysByDate = new Map<string, Map<string, TransportVehicle>>();

    previousTransport.forEach((jour: any) => {
      const immat = jour.immatriculation || "";
      if (!immat) return;

      // Utiliser la date relative (lundi, mardi, etc.) pas la date exacte
      const oldDate = new Date(jour.date);
      const dayOfWeek = oldDate.getDay() === 0 ? 6 : oldDate.getDay() - 1; // 0 = lundi, 4 = vendredi

      const newWeekStart = parseISOWeek(currentWeek);
      const newDate = format(addDays(newWeekStart, dayOfWeek), "yyyy-MM-dd");

      if (!daysByDate.has(newDate)) {
        daysByDate.set(newDate, new Map());
      }

      const vehiculesMap = daysByDate.get(newDate)!;

      if (!vehiculesMap.has(immat)) {
        vehiculesMap.set(immat, {
          id: crypto.randomUUID(),
          immatriculation: immat,
          conducteurMatinId: "",
          conducteurMatinNom: "",
          conducteurSoirId: "",
          conducteurSoirNom: "",
        });
      }

      const vehicule = vehiculesMap.get(immat)!;

      if (jour.periode === "MATIN" && jour.conducteur_aller_id) {
        vehicule.conducteurMatinId = jour.conducteur_aller_id;
        vehicule.conducteurMatinNom = jour.conducteur_aller
          ? `${jour.conducteur_aller.prenom} ${jour.conducteur_aller.nom}`
          : "";
      } else if (jour.periode === "SOIR" && jour.conducteur_retour_id) {
        vehicule.conducteurSoirId = jour.conducteur_retour_id;
        vehicule.conducteurSoirNom = jour.conducteur_retour
          ? `${jour.conducteur_retour.prenom} ${jour.conducteur_retour.nom}`
          : "";
      }
    });

    // Construire les 5 jours complets
    const copiedDays: TransportDayV2[] = [];
    const weekStart = parseISOWeek(currentWeek);

    for (let i = 0; i < 5; i++) {
      const dateString = format(addDays(weekStart, i), "yyyy-MM-dd");
      const vehiculesMap = daysByDate.get(dateString);

      copiedDays.push({
        date: dateString,
        vehicules: vehiculesMap
          ? Array.from(vehiculesMap.values())
          : [{
              id: crypto.randomUUID(),
              immatriculation: "",
              conducteurMatinId: "",
              conducteurMatinNom: "",
              conducteurSoirId: "",
              conducteurSoirNom: "",
            }],
      });
    }

    console.log("[useCopyPreviousWeekTransport] Copied data from", previousWeek, "to", currentWeek);
    onDataLoaded(copiedDays);
    hasCalledOnDataLoaded.current = true; // Marquer comme appelé
  }, [previousTransport, currentWeek, previousWeek]);

  return { 
    previousWeek, 
    hasPreviousData: !!previousTransport && previousTransport.length > 0,
    copyFromPrevious: refetch // Exposer la fonction pour copie manuelle
  };
};
