import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Hook pour supprimer les fiches d'un maçon lors de son retrait
export const useDeleteFichesByMacon = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      maconId, 
      chantierId, 
      semaine 
    }: { 
      maconId: string; 
      chantierId: string; 
      semaine: string;
    }) => {
      // 1. Récupérer les fiches concernées (BROUILLON ou VALIDE_CHEF uniquement)
      const { data: fiches, error: fetchError } = await supabase
        .from("fiches")
        .select("id")
        .eq("salarie_id", maconId)
        .eq("chantier_id", chantierId)
        .eq("semaine", semaine)
        .in("statut", ["BROUILLON", "VALIDE_CHEF"]);

      if (fetchError) throw fetchError;
      if (!fiches || fiches.length === 0) return { deleted: 0 };

      const ficheIds = fiches.map(f => f.id);

      // 2. Supprimer les signatures liées
      const { error: signaturesError } = await supabase
        .from("signatures")
        .delete()
        .in("fiche_id", ficheIds);

      if (signaturesError) throw signaturesError;

      // 3. Supprimer les fiches_jours
      const { error: joursError } = await supabase
        .from("fiches_jours")
        .delete()
        .in("fiche_id", ficheIds);

      if (joursError) throw joursError;

      // 4. Supprimer les fiches
      const { error: fichesError } = await supabase
        .from("fiches")
        .delete()
        .in("id", ficheIds);

      if (fichesError) throw fichesError;

      return { deleted: ficheIds.length };
    },
    onSuccess: (data) => {
      if (data.deleted > 0) {
        queryClient.invalidateQueries({ queryKey: ["fiches"] });
        toast({
          title: "Fiches supprimées",
          description: `${data.deleted} fiche(s) en cours ont été supprimées.`,
        });
      }
    },
    onError: (error) => {
      console.error("Error deleting fiches:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les fiches en cours.",
        variant: "destructive",
      });
    },
  });
};

export interface Fiche {
  id: string;
  semaine: string;
  chantier_id: string;
  salarie_id: string;
  statut: string;
  total_heures: number;
  created_at: string;
  updated_at: string;
  chantier?: {
    id: string;
    nom: string;
    code_chantier: string;
    ville: string;
  };
  salarie?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
  chef?: {
    id: string;
    nom: string;
    prenom: string;
  };
}

export interface FicheJour {
  id: string;
  fiche_id: string;
  date: string;
  heures: number;
  pause_minutes: number;
  heure_debut?: string;
  heure_fin?: string;
  ville_du_jour?: string;
  code_chantier_du_jour?: string;
  HNORM?: number;
  HI?: number;
  T?: number;
  PA?: boolean;
}

export const useFichesByStatus = (status: string, filters?: { semaine?: string; chantier?: string; chef?: string; conducteur?: string }) => {
  return useQuery({
    queryKey: ["fiches", status, filters, localStorage.getItem("current_entreprise_id")],
    queryFn: async () => {
      // 🔐 FILTRAGE CRITIQUE PAR ENTREPRISE - Isolation multi-tenant
      const entrepriseId = localStorage.getItem("current_entreprise_id");
      if (!entrepriseId) {
        console.warn("No entreprise_id found in localStorage - returning empty");
        return [];
      }

      // Récupérer les chantiers autorisés pour cette entreprise
      let chantiersQuery = supabase
        .from("chantiers")
        .select("id")
        .eq("entreprise_id", entrepriseId);
      
      // 🔐 FILTRAGE PAR CONDUCTEUR - critique pour l'onglet Validation
      if (filters?.conducteur && filters.conducteur !== "all") {
        chantiersQuery = chantiersQuery.eq("conducteur_id", filters.conducteur);
      }
      
      const { data: entrepriseChantiers, error: entrepriseChantiersError } = await chantiersQuery;
      
      if (entrepriseChantiersError) {
        console.error("Error fetching entreprise chantiers:", entrepriseChantiersError);
        throw entrepriseChantiersError;
      }

      const allowedChantierIds = entrepriseChantiers?.map(c => c.id) || [];
      
      // Si l'entreprise n'a pas de chantiers (ou le conducteur n'a pas de chantiers), retourner vide
      if (allowedChantierIds.length === 0) {
        return [];
      }

      // If filtering by chef, first get the chantiers for that chef
      let chantierIds: string[] | null = null;
      if (filters?.chef && filters.chef !== "all") {
        const { data: chantiers, error: chantiersError } = await supabase
          .from("chantiers")
          .select("id")
          .eq("chef_id", filters.chef)
          .eq("entreprise_id", entrepriseId);
        
        if (chantiersError) {
          console.error("Error fetching chantiers for chef:", chantiersError);
          throw chantiersError;
        }
        
        chantierIds = chantiers?.map(c => c.id) || [];
        
        // If chef has no chantiers, return empty array immediately
        if (chantierIds.length === 0) {
          return [];
        }
      }

      // ÉTAPE 1: Récupérer les combinaisons chantier/semaine qui ont au moins une fiche avec le statut demandé
      // 🔐 Filtrer uniquement les chantiers de l'entreprise courante
      let statusQuery = supabase
        .from("fiches")
        .select("chantier_id, semaine")
        .eq("statut", status as any)
        .in("chantier_id", allowedChantierIds);

      if (filters?.semaine && filters.semaine !== "all") {
        statusQuery = statusQuery.eq("semaine", filters.semaine);
      }

      if (filters?.chantier && filters.chantier !== "all") {
        statusQuery = statusQuery.eq("chantier_id", filters.chantier);
      }

      if (chantierIds && chantierIds.length > 0) {
        statusQuery = statusQuery.in("chantier_id", chantierIds);
      }

      const { data: matchingFiches, error: statusError } = await statusQuery;

      if (statusError) {
        console.error("Error fetching fiches by status:", statusError);
        throw statusError;
      }

      if (!matchingFiches || matchingFiches.length === 0) {
        return [];
      }

      // Extraire les combinaisons uniques chantier_id/semaine
      const chantierSemainePairs = Array.from(
        new Set(matchingFiches.map(f => `${f.chantier_id}|${f.semaine}`))
      );

      // ÉTAPE 2: Récupérer TOUTES les fiches pour ces combinaisons (sans filtre de statut)
      const allFichesPromises = chantierSemainePairs.map(async (pair) => {
        const [chantierId, semaine] = pair.split("|");
        
        const { data, error } = await supabase
          .from("fiches")
          .select(`
            id,
            semaine,
            chantier_id,
            salarie_id,
            statut,
            total_heures,
            created_at,
            updated_at,
            chantier:chantiers!chantier_id(
              id, 
              nom, 
              code_chantier, 
              ville, 
              chef_id,
              chef:utilisateurs!chef_id(id, nom, prenom)
            )
          `)
          .eq("chantier_id", chantierId)
          .eq("semaine", semaine)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching all fiches for pair:", error);
          return [];
        }

        return data || [];
      });

      const allFichesArrays = await Promise.all(allFichesPromises);
      const data = allFichesArrays.flat();

      // Group by chantier and get salarie info from affectations_view
      const fichesWithDetails = await Promise.all(
        data.map(async (fiche) => {
          // Get chef from chantier directly
          const chef = fiche.chantier?.chef || null;
          
          // Get macon info from affectations_view
          const { data: affectation } = await supabase
            .from("affectations_view")
            .select("macon_nom, macon_prenom, macon_email")
            .eq("chantier_id", fiche.chantier_id)
            .eq("macon_id", fiche.salarie_id)
            .maybeSingle();

          return {
            ...fiche,
            chef: chef,
            salarie: affectation ? {
              id: fiche.salarie_id,
              nom: affectation.macon_nom,
              prenom: affectation.macon_prenom,
              email: affectation.macon_email,
            } : null,
          };
        })
      );

      // Group by chantier and semaine
      const grouped = fichesWithDetails.reduce((acc, fiche) => {
        const key = `${fiche.chantier_id}-${fiche.semaine}`;
        if (!acc[key]) {
          acc[key] = {
            id: key,
            semaine: fiche.semaine,
            chantier: fiche.chantier,
            chef: fiche.chef,
            fiches: [],
            total_heures: 0,
            nombre_macons: 0,
          };
        }
        acc[key].fiches.push(fiche);
        acc[key].total_heures += Number(fiche.total_heures || 0);
        acc[key].nombre_macons += 1;
        return acc;
      }, {} as Record<string, any>);

      // Tri par semaine (du plus ancien au plus récent) pour l'affichage chronologique
      return Object.values(grouped).sort((a, b) => a.semaine.localeCompare(b.semaine));
    },
  });
};

export const useFicheDetail = (ficheId: string) => {
  return useQuery({
    queryKey: ["fiche", ficheId],
    queryFn: async () => {
      // Check if ficheId is a composite key (chantier-semaine)
      // Format: "uuid-2025-S42" where uuid contains 4 hyphens
      const lastHyphenIndex = ficheId.lastIndexOf("-");
      const secondLastHyphenIndex = ficheId.lastIndexOf("-", lastHyphenIndex - 1);
      const isComposite = ficheId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d{4}-(W|S)\d{2}$/i);
      
      if (isComposite) {
        const chantierId = ficheId.substring(0, secondLastHyphenIndex);
        const semaine = ficheId.substring(secondLastHyphenIndex + 1);
        
        const { data: fiches, error } = await supabase
          .from("fiches")
          .select(`
            id,
            semaine,
            chantier_id,
            salarie_id,
            statut,
            total_heures,
            created_at,
            updated_at,
            chantier:chantiers!chantier_id(id, nom, code_chantier, ville)
          `)
          .eq("chantier_id", chantierId)
          .eq("semaine", semaine);

        if (error) throw error;

        // Get chef info from chantier and salarie info from affectations_view
        if (fiches && fiches.length > 0) {
          // Get chef from the chantier
          const { data: chantier } = await supabase
            .from("chantiers")
            .select("chef_id, chef:utilisateurs!chef_id(id, nom, prenom)")
            .eq("id", chantierId)
            .single();

          // Enrich all fiches with salarie info from affectations_view and signatures
          const enrichedFiches = await Promise.all(
            fiches.map(async (fiche) => {
              const { data: affectation } = await supabase
                .from("affectations_view")
                .select("macon_id, macon_nom, macon_prenom, macon_email")
                .eq("chantier_id", chantierId)
                .eq("macon_id", fiche.salarie_id)
                .maybeSingle();

              // Get signatures for this fiche
              const { data: signatures } = await supabase
                .from("signatures")
                .select("id, signed_by, signed_at, role, signature_data")
                .eq("fiche_id", fiche.id);

              return {
                ...fiche,
                salarie: affectation ? {
                  id: affectation.macon_id,
                  nom: affectation.macon_nom,
                  prenom: affectation.macon_prenom,
                  email: affectation.macon_email,
                } : null,
                signatures: signatures || [],
              };
            })
          );

          return {
            ...fiches[0],
            chef: chantier?.chef || null,
            salarie: enrichedFiches[0]?.salarie || null,
            all_fiches: enrichedFiches,
          };
        }
      } else {
        const { data: fiche, error } = await supabase
          .from("fiches")
          .select(`
            id,
            semaine,
            chantier_id,
            salarie_id,
            statut,
            total_heures,
            created_at,
            updated_at,
            chantier:chantiers!chantier_id(id, nom, code_chantier, ville)
          `)
          .eq("id", ficheId)
          .single();

        if (error) throw error;

        // Get chef from chantier
        const { data: chantier } = await supabase
          .from("chantiers")
          .select("chef_id, chef:utilisateurs!chef_id(id, nom, prenom)")
          .eq("id", fiche.chantier_id)
          .maybeSingle();

        // Get salarie from affectations_view
        const { data: affectation } = await supabase
          .from("affectations_view")
          .select("macon_id, macon_nom, macon_prenom, macon_email")
          .eq("chantier_id", fiche.chantier_id)
          .eq("macon_id", fiche.salarie_id)
          .maybeSingle();

        return {
          ...fiche,
          chef: chantier?.chef || null,
          salarie: affectation ? {
            id: affectation.macon_id,
            nom: affectation.macon_nom,
            prenom: affectation.macon_prenom,
            email: affectation.macon_email,
          } : null,
          all_fiches: [{
            ...fiche,
            salarie: affectation ? {
              id: affectation.macon_id,
              nom: affectation.macon_nom,
              prenom: affectation.macon_prenom,
              email: affectation.macon_email,
            } : null,
          }],
        };
      }

      return null;
    },
    enabled: !!ficheId,
  });
};

export const useFicheJours = (ficheId: string) => {
  return useQuery({
    queryKey: ["fiches_jours", ficheId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fiches_jours")
        .select("*")
        .eq("fiche_id", ficheId)
        .order("date");

      if (error) throw error;
      return data;
    },
    enabled: !!ficheId,
  });
};

export const useFicheDetailWithJours = (ficheId: string) => {
  return useQuery({
    queryKey: ["fiche-with-jours", ficheId],
    queryFn: async () => {
      // Check if ficheId is a composite key (chantier-semaine)
      const lastHyphenIndex = ficheId.lastIndexOf("-");
      const secondLastHyphenIndex = ficheId.lastIndexOf("-", lastHyphenIndex - 1);
      const isComposite = ficheId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d{4}-(W|S)\d{2}$/i);
      
      if (isComposite) {
        const chantierId = ficheId.substring(0, secondLastHyphenIndex);
        const semaine = ficheId.substring(secondLastHyphenIndex + 1);
        
        const { data: fiches, error } = await supabase
          .from("fiches")
          .select(`
            id,
            semaine,
            chantier_id,
            salarie_id,
            statut,
            total_heures,
            created_at,
            updated_at,
            chantier:chantiers!chantier_id(id, nom, code_chantier, ville)
          `)
          .eq("chantier_id", chantierId)
          .eq("semaine", semaine);

        if (error) throw error;

        if (fiches && fiches.length > 0) {
          const { data: chantier } = await supabase
            .from("chantiers")
            .select("chef_id, chef:utilisateurs!chef_id(id, nom, prenom)")
            .eq("id", chantierId)
            .single();

          const enrichedFiches = await Promise.all(
            fiches.map(async (fiche) => {
              let salarieInfo = null;
              
              // Vérifier si le salarié est le chef
              const isChef = fiche.salarie_id === chantier?.chef_id;
              
              if (isChef) {
                // Récupérer depuis utilisateurs si c'est le chef
                const { data: utilisateur } = await supabase
                  .from("utilisateurs")
                  .select("id, nom, prenom, email, agence_interim, role_metier")
                  .eq("id", fiche.salarie_id)
                  .maybeSingle();
                
                if (utilisateur) {
                  salarieInfo = {
                    id: utilisateur.id,
                    nom: utilisateur.nom,
                    prenom: utilisateur.prenom,
                    email: utilisateur.email,
                    agence_interim: utilisateur.agence_interim,
                    role_metier: utilisateur.role_metier,
                  };
                }
              } else {
                // D'abord essayer de récupérer depuis utilisateurs (source de vérité)
                const { data: utilisateur } = await supabase
                  .from("utilisateurs")
                  .select("id, nom, prenom, email, agence_interim, role_metier")
                  .eq("id", fiche.salarie_id)
                  .maybeSingle();
                
                if (utilisateur) {
                  salarieInfo = {
                    id: utilisateur.id,
                    nom: utilisateur.nom,
                    prenom: utilisateur.prenom,
                    email: utilisateur.email,
                    agence_interim: utilisateur.agence_interim,
                    role_metier: utilisateur.role_metier,
                  };
                } else {
                  // Fallback vers affectations_view si utilisateur non trouvé
                  const { data: affectation } = await supabase
                    .from("affectations_view")
                    .select("macon_id, macon_nom, macon_prenom, macon_email")
                    .eq("chantier_id", chantierId)
                    .eq("macon_id", fiche.salarie_id)
                    .maybeSingle();
                  
                  if (affectation) {
                    salarieInfo = {
                      id: affectation.macon_id,
                      nom: affectation.macon_nom,
                      prenom: affectation.macon_prenom,
                      email: affectation.macon_email,
                    };
                  }
                }
              }

              const { data: signatures } = await supabase
                .from("signatures")
                .select("id, signed_by, signed_at, role, signature_data")
                .eq("fiche_id", fiche.id);

              // Get fiches_jours to calculate paniers, trajets, intemperie
              const { data: ficheJours } = await supabase
                .from("fiches_jours")
                .select("id, date, heures, HNORM, HI, T, PA, pause_minutes, code_chantier_du_jour, ville_du_jour, trajet_perso, total_jour")
                .eq("fiche_id", fiche.id);

              const paniers = ficheJours?.filter(fj => fj.PA === true).length || 0;
              const trajets = ficheJours?.reduce((sum, fj) => sum + (fj.T || 0), 0) || 0;
              const intemperie = ficheJours?.reduce((sum, fj) => sum + (fj.HI || 0), 0) || 0;

              return {
                ...fiche,
                salarie: salarieInfo,
                signatures: signatures || [],
                fiches_jours: ficheJours || [],
                paniers,
                trajets,
                intemperie,
              };
            })
          );

          return {
            ...fiches[0],
            chef: chantier?.chef || null,
            salarie: enrichedFiches[0]?.salarie || null,
            all_fiches: enrichedFiches,
          };
        }
      } else {
        const { data: fiche, error } = await supabase
          .from("fiches")
          .select(`
            id,
            semaine,
            chantier_id,
            salarie_id,
            statut,
            total_heures,
            created_at,
            updated_at,
            chantier:chantiers!chantier_id(id, nom, code_chantier, ville)
          `)
          .eq("id", ficheId)
          .single();

        if (error) throw error;

        const { data: chantier } = await supabase
          .from("chantiers")
          .select("chef_id, chef:utilisateurs!chef_id(id, nom, prenom)")
          .eq("id", fiche.chantier_id)
          .maybeSingle();

        // Vérifier si le salarié est le chef
        let salarieInfo = null;
        const isChef = fiche.salarie_id === chantier?.chef_id;
        
        if (isChef) {
          // Récupérer depuis utilisateurs si c'est le chef
          const { data: utilisateur } = await supabase
            .from("utilisateurs")
            .select("id, nom, prenom, email, agence_interim, role_metier")
            .eq("id", fiche.salarie_id)
            .maybeSingle();
          
          if (utilisateur) {
            salarieInfo = {
              id: utilisateur.id,
              nom: utilisateur.nom,
              prenom: utilisateur.prenom,
              email: utilisateur.email,
              agence_interim: utilisateur.agence_interim,
              role_metier: utilisateur.role_metier,
            };
          }
        } else {
          // D'abord essayer de récupérer depuis utilisateurs (source de vérité)
          const { data: utilisateur } = await supabase
            .from("utilisateurs")
            .select("id, nom, prenom, email, agence_interim, role_metier")
            .eq("id", fiche.salarie_id)
            .maybeSingle();
          
          if (utilisateur) {
            salarieInfo = {
              id: utilisateur.id,
              nom: utilisateur.nom,
              prenom: utilisateur.prenom,
              email: utilisateur.email,
              agence_interim: utilisateur.agence_interim,
              role_metier: utilisateur.role_metier,
            };
          } else {
            // Fallback vers affectations_view si utilisateur non trouvé
            const { data: affectation } = await supabase
              .from("affectations_view")
              .select("macon_id, macon_nom, macon_prenom, macon_email")
              .eq("chantier_id", fiche.chantier_id)
              .eq("macon_id", fiche.salarie_id)
              .maybeSingle();
            
            if (affectation) {
              salarieInfo = {
                id: affectation.macon_id,
                nom: affectation.macon_nom,
                prenom: affectation.macon_prenom,
                email: affectation.macon_email,
              };
            }
          }
        }

        const { data: signatures } = await supabase
          .from("signatures")
          .select("id, signed_by, signed_at, role, signature_data")
          .eq("fiche_id", fiche.id);

        // Get fiches_jours to calculate paniers, trajets, intemperie
        const { data: ficheJours } = await supabase
          .from("fiches_jours")
          .select("id, date, heures, HNORM, HI, T, PA, pause_minutes, code_chantier_du_jour, ville_du_jour, trajet_perso, total_jour")
          .eq("fiche_id", fiche.id);

        const paniers = ficheJours?.filter(fj => fj.PA === true).length || 0;
        const trajets = ficheJours?.reduce((sum, fj) => sum + (fj.T || 0), 0) || 0;
        const intemperie = ficheJours?.reduce((sum, fj) => sum + (fj.HI || 0), 0) || 0;

        return {
          ...fiche,
          chef: chantier?.chef || null,
          salarie: salarieInfo,
          signatures: signatures || [],
          fiches_jours: ficheJours || [],
          paniers,
          trajets,
          intemperie,
          all_fiches: [{
            ...fiche,
            salarie: salarieInfo,
            signatures: signatures || [],
            fiches_jours: ficheJours || [],
            paniers,
            trajets,
            intemperie,
          }],
        };
      }

      return null;
    },
    enabled: !!ficheId,
  });
};

export const useUpdateFicheStatus = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ficheId, status, comment, chantierId, semaine }: { ficheId?: string; status: string; comment?: string; chantierId?: string; semaine?: string }) => {
      let updatedFiches: any[] | null = null;

      // Prefer explicit chantierId + semaine when provided
      if (chantierId && semaine) {
        const { data, error } = await supabase
          .from("fiches")
          .update({ statut: status as any })
          .eq("chantier_id", chantierId)
          .eq("semaine", semaine)
          .select("id, salarie_id, semaine");

        if (error) throw error;
        updatedFiches = data;
      } else if (ficheId) {
        // Fallback to ficheId
        const { data, error } = await supabase
          .from("fiches")
          .update({ statut: status as any })
          .eq("id", ficheId)
          .select("id, salarie_id, semaine");

        if (error) throw error;
        updatedFiches = data;
      } else {
        throw new Error("Missing fiche identifier: provide either ficheId or chantierId + semaine");
      }

      // Si transmission au RH, injecter automatiquement les congés validés
      if (status === "ENVOYE_RH" && updatedFiches && updatedFiches.length > 0) {
        const { injectValidatedLeaves } = await import("@/hooks/useInjectValidatedLeaves");
        await injectValidatedLeaves(updatedFiches);
      }

      return updatedFiches;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["rh-consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["demandes-conges"] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut de la fiche a été mis à jour avec succès.",
      });
    },
    onError: (error) => {
      console.error("Error updating fiche status:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du statut.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateFicheData = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      ficheId, 
      totalHeures, 
      paniers, 
      trajets, 
      intemperie 
    }: {
      ficheId: string;
      totalHeures?: number;
      paniers?: number;
      trajets?: number;
      intemperie?: number;
    }) => {
      console.log("🔧 Starting mutation - ficheId:", ficheId, "totalHeures:", totalHeures);
      
      // ✅ Fetch current status to preserve it
      const { data: currentFiche, error: fetchError } = await supabase
        .from("fiches")
        .select("statut")
        .eq("id", ficheId)
        .single();

      if (fetchError) {
        console.error("❌ Error fetching current fiche:", fetchError);
        throw fetchError;
      }

      console.log("📋 Current status:", currentFiche.statut);

      const updateData: any = {
        statut: currentFiche.statut, // Explicitly preserve status
      };
      
      if (totalHeures !== undefined) {
        updateData.total_heures = totalHeures;
      }
      
      console.log("💾 Updating fiches table with:", updateData);
      
      const { error } = await supabase
        .from("fiches")
        .update(updateData)
        .eq("id", ficheId);
      
      if (error) {
        console.error("❌ Error updating fiches:", error);
        throw error;
      }

      // Update fiches_jours for paniers, trajets, intemperie
      if (paniers !== undefined || trajets !== undefined || intemperie !== undefined) {
        console.log("📅 Updating fiches_jours - paniers:", paniers, "trajets:", trajets, "intemperie:", intemperie);
        
        const { data: ficheJours, error: joursError } = await supabase
          .from("fiches_jours")
          .select("*")
          .eq("fiche_id", ficheId)
          .order("date");

        if (joursError) {
          console.error("❌ Error fetching jours:", joursError);
          throw joursError;
        }

        if (ficheJours && ficheJours.length > 0) {
          // Distribute values across days
          for (let i = 0; i < ficheJours.length; i++) {
            const jour = ficheJours[i];
            const jourUpdate: any = {};
            
            if (paniers !== undefined) {
              jourUpdate.PA = i < paniers;
            }
            if (trajets !== undefined) {
              jourUpdate.T = i === 0 ? trajets : 0;
            }
            if (intemperie !== undefined) {
              jourUpdate.HI = i === 0 ? intemperie : 0;
            }

            const { error: jourUpdateError } = await supabase
              .from("fiches_jours")
              .update(jourUpdate)
              .eq("id", jour.id);

            if (jourUpdateError) {
              console.error("❌ Error updating jour:", jourUpdateError);
              throw jourUpdateError;
            }
          }
        }
      }
      
      console.log("✅ Mutation completed successfully");
    },
    onSuccess: (_, variables) => {
      console.log("🔄 Invalidating queries for ficheId:", variables.ficheId);
      queryClient.invalidateQueries({ queryKey: ["fiche-with-jours", variables.ficheId] });
      queryClient.invalidateQueries({ queryKey: ["fiches"] });
      queryClient.invalidateQueries({ queryKey: ["rh-consolidated"] });
      queryClient.invalidateQueries({ queryKey: ["rh-summary"] });
      queryClient.invalidateQueries({ queryKey: ["rh-details"] });
      queryClient.invalidateQueries({ queryKey: ["rh-fiche-detail"] });
      queryClient.invalidateQueries({ queryKey: ["rh-employee-detail"] });
      
      toast({
        title: "Modifications enregistrées",
        description: "Les données ont été mises à jour avec succès.",
      });
    },
    onError: (error) => {
      console.error("Error updating fiche data:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour des données.",
        variant: "destructive",
      });
    },
  });
};
