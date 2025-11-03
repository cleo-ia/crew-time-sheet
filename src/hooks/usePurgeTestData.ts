import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getNextWeek } from "@/lib/weekUtils";

interface TestDataCounts {
  fiches: number;
  fiches_jours: number;
  fiches_transport: number;
  fiches_transport_jours: number;
  signatures: number;
}

export const usePurgeTestData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [counts, setCounts] = useState<TestDataCounts | null>(null);
  const queryClient = useQueryClient();

  const getCurrentWeek = () => {
    return format(new Date(), "RRRR-'S'II");
  };

  const getCounts = async () => {
    const currentWeek = getCurrentWeek();
    const nextWeek = getNextWeek(currentWeek);
    const weeks = [currentWeek, nextWeek];
    
    try {
      // Compter les fiches pour S43 + S44
      const { count: fichesCount } = await supabase
        .from("fiches")
        .select("*", { count: "exact", head: true })
        .in("semaine", weeks);

      // Récupérer les IDs de fiches pour compter les dépendances
      const { data: fiches } = await supabase
        .from("fiches")
        .select("id")
        .in("semaine", weeks);
      
      const ficheIds = fiches?.map(f => f.id) || [];

      // Compter les fiches_jours
      const { count: fichesJoursCount } = await supabase
        .from("fiches_jours")
        .select("*", { count: "exact", head: true })
        .in("fiche_id", ficheIds.length > 0 ? ficheIds : ['00000000-0000-0000-0000-000000000000']);

      // Compter les signatures
      const { count: signaturesCount } = await supabase
        .from("signatures")
        .select("*", { count: "exact", head: true })
        .in("fiche_id", ficheIds.length > 0 ? ficheIds : ['00000000-0000-0000-0000-000000000000']);

      // Compter les fiches_transport pour S43 + S44
      const { count: fichesTransportCount } = await supabase
        .from("fiches_transport")
        .select("*", { count: "exact", head: true })
        .in("semaine", weeks);

      // Récupérer les IDs de transport pour compter les dépendances
      const { data: transports } = await supabase
        .from("fiches_transport")
        .select("id")
        .in("semaine", weeks);
      
      const transportIds = transports?.map(t => t.id) || [];

      // Compter les fiches_transport_jours
      const { count: transportJoursCount } = await supabase
        .from("fiches_transport_jours")
        .select("*", { count: "exact", head: true })
        .in("fiche_transport_id", transportIds.length > 0 ? transportIds : ['00000000-0000-0000-0000-000000000000']);

      const countsData: TestDataCounts = {
        fiches: fichesCount || 0,
        fiches_jours: fichesJoursCount || 0,
        fiches_transport: fichesTransportCount || 0,
        fiches_transport_jours: transportJoursCount || 0,
        signatures: signaturesCount || 0,
      };

      setCounts(countsData);
      return countsData;
    } catch (error) {
      console.error("Erreur lors du comptage des données:", error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les compteurs",
        variant: "destructive",
      });
      return null;
    }
  };

  const purge = async () => {
    setIsLoading(true);
    const currentWeek = getCurrentWeek();
    const nextWeek = getNextWeek(currentWeek);
    const weeks = [currentWeek, nextWeek];
    
    try {
      // Récupérer les compteurs avant suppression
      const beforeCounts = await getCounts();
      if (!beforeCounts) {
        throw new Error("Impossible de récupérer les compteurs");
      }

      // Récupérer les IDs pour S43 + S44
      const { data: fiches } = await supabase
        .from("fiches")
        .select("id")
        .in("semaine", weeks);
      
      const ficheIds = fiches?.map(f => f.id) || [];

      const { data: transports } = await supabase
        .from("fiches_transport")
        .select("id")
        .in("semaine", weeks);
      
      const transportIds = transports?.map(t => t.id) || [];

      // Suppression dans l'ordre pour respecter les contraintes FK
      if (ficheIds.length > 0) {
        // 1. Supprimer les signatures
        const { error: signaturesError } = await supabase
          .from("signatures")
          .delete()
          .in("fiche_id", ficheIds);
        
        if (signaturesError) throw signaturesError;
      }

      if (transportIds.length > 0) {
        // 2. Supprimer les fiches_transport_jours
        const { error: transportJoursError } = await supabase
          .from("fiches_transport_jours")
          .delete()
          .in("fiche_transport_id", transportIds);
        
        if (transportJoursError) throw transportJoursError;

        // 3. Supprimer les fiches_transport
        const { error: transportError } = await supabase
          .from("fiches_transport")
          .delete()
          .in("semaine", weeks);
        
        if (transportError) throw transportError;
      }

      if (ficheIds.length > 0) {
        // 4. Supprimer les fiches_jours
        const { error: fichesJoursError } = await supabase
          .from("fiches_jours")
          .delete()
          .in("fiche_id", ficheIds);
        
        if (fichesJoursError) throw fichesJoursError;

        // 5. Supprimer les fiches
        const { error: fichesError } = await supabase
          .from("fiches")
          .delete()
          .in("semaine", weeks);
        
        if (fichesError) throw fichesError;
      }

      // Invalider les caches
      await queryClient.invalidateQueries({ queryKey: ["fiches"] });
      await queryClient.invalidateQueries({ queryKey: ["fiche-id"] });
      await queryClient.invalidateQueries({ queryKey: ["transport"] });
      await queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
      await queryClient.invalidateQueries({ queryKey: ["rh-data"] });
      await queryClient.invalidateQueries({ queryKey: ["validation-fiches"] });

      // Actualiser les compteurs
      await getCounts();

      const total = Object.values(beforeCounts).reduce((a, b) => a + b, 0);

      toast({
        title: "✅ Données purgées avec succès",
        description: `${total} enregistrements supprimés pour ${currentWeek} et ${nextWeek}`,
      });

      console.log("Données supprimées:", beforeCounts);

      return true;
    } catch (error) {
      console.error("Erreur lors de la purge:", error);
      toast({
        title: "Erreur",
        description: "Impossible de purger les données",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const purgeByChantier = async (semaine: string, chantierName: string) => {
    setIsLoading(true);
    try {
      console.log(`[Purge] Recherche du chantier "${chantierName}"...`);
      
      // 1. Find chantier ID
      const { data: chantiers, error: chantierError } = await supabase
        .from("chantiers")
        .select("id, nom")
        .ilike("nom", `%${chantierName}%`)
        .limit(1);

      if (chantierError) throw chantierError;
      if (!chantiers || chantiers.length === 0) {
        throw new Error(`Chantier "${chantierName}" introuvable`);
      }

      const chantierId = chantiers[0].id;
      console.log(`[Purge] Chantier trouvé: ${chantiers[0].nom} (${chantierId})`);

      // 2. Find all fiches for this week and chantier
      const { data: fiches, error: fichesError } = await supabase
        .from("fiches")
        .select("id")
        .eq("semaine", semaine)
        .eq("chantier_id", chantierId);

      if (fichesError) throw fichesError;
      
      if (!fiches || fiches.length === 0) {
        console.log(`[Purge] Aucune fiche trouvée pour ${semaine} / ${chantiers[0].nom}`);
        toast({
          title: "Aucune donnée",
          description: `Aucune fiche trouvée pour la semaine ${semaine} sur ${chantiers[0].nom}`,
        });
        return false;
      }

      const ficheIds = fiches.map(f => f.id);
      console.log(`[Purge] ${ficheIds.length} fiche(s) trouvée(s)`);

      // 3. Delete in correct order (respecting foreign keys)
      
      // 3a. Delete signatures
      console.log("[Purge] Suppression des signatures...");
      const { error: sigError } = await supabase
        .from("signatures")
        .delete()
        .in("fiche_id", ficheIds);
      if (sigError) throw sigError;

      // 3b. Delete fiches_transport_finisseurs_jours
      console.log("[Purge] Suppression des fiches_transport_finisseurs_jours...");
      const { data: transportFinisseursIds, error: transportFinisseursIdsError } = await supabase
        .from("fiches_transport_finisseurs")
        .select("id")
        .in("fiche_id", ficheIds);
      
      if (transportFinisseursIdsError) throw transportFinisseursIdsError;
      
      if (transportFinisseursIds && transportFinisseursIds.length > 0) {
        const transportFinisseursIdList = transportFinisseursIds.map(t => t.id);
        const { error: transportFinisseursJoursError } = await supabase
          .from("fiches_transport_finisseurs_jours")
          .delete()
          .in("fiche_transport_finisseur_id", transportFinisseursIdList);
        if (transportFinisseursJoursError) throw transportFinisseursJoursError;

        // Delete fiches_transport_finisseurs
        console.log("[Purge] Suppression des fiches_transport_finisseurs...");
        const { error: transportFinisseursError } = await supabase
          .from("fiches_transport_finisseurs")
          .delete()
          .in("id", transportFinisseursIdList);
        if (transportFinisseursError) throw transportFinisseursError;
      }

      // 3c. Delete fiches_transport_jours
      console.log("[Purge] Suppression des fiches_transport_jours...");
      const { data: transportIds, error: transportIdsError } = await supabase
        .from("fiches_transport")
        .select("id")
        .in("fiche_id", ficheIds);
      
      if (transportIdsError) throw transportIdsError;
      
      if (transportIds && transportIds.length > 0) {
        const transportIdList = transportIds.map(t => t.id);
        const { error: transportJoursError } = await supabase
          .from("fiches_transport_jours")
          .delete()
          .in("fiche_transport_id", transportIdList);
        if (transportJoursError) throw transportJoursError;

        // Delete fiches_transport
        console.log("[Purge] Suppression des fiches_transport...");
        const { error: transportError } = await supabase
          .from("fiches_transport")
          .delete()
          .in("id", transportIdList);
        if (transportError) throw transportError;
      }

      // 3d. Delete fiches_jours
      console.log("[Purge] Suppression des fiches_jours...");
      const { error: joursError } = await supabase
        .from("fiches_jours")
        .delete()
        .in("fiche_id", ficheIds);
      if (joursError) throw joursError;

      // 3e. Finally, delete fiches
      console.log("[Purge] Suppression des fiches...");
      const { error: fichesDeleteError } = await supabase
        .from("fiches")
        .delete()
        .in("id", ficheIds);
      if (fichesDeleteError) throw fichesDeleteError;

      console.log("[Purge] Purge terminée avec succès !");

      // Invalider les caches
      await queryClient.invalidateQueries({ queryKey: ["fiches"] });
      await queryClient.invalidateQueries({ queryKey: ["fiche-id"] });
      await queryClient.invalidateQueries({ queryKey: ["transport"] });
      await queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
      await queryClient.invalidateQueries({ queryKey: ["rh-data"] });
      await queryClient.invalidateQueries({ queryKey: ["validation-fiches"] });

      toast({
        title: "✅ Données supprimées",
        description: `${ficheIds.length} fiche(s) et leurs données associées ont été supprimées pour ${semaine} / ${chantiers[0].nom}`,
      });

      await getCounts();
      return true;

    } catch (error: any) {
      console.error("[Purge] Erreur:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer les données",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getCounts,
    purge,
    purgeByChantier,
    isLoading,
    counts,
    currentWeek: getCurrentWeek(),
  };
};
