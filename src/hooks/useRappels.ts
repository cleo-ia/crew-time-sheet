import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useRappels = () => {
  // Mutation pour lancer rappel-chefs
  const triggerRappelChefs = useMutation({
    mutationFn: async () => {
      // Récupérer l'utilisateur courant
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke("rappel-chefs", {
        body: {
          execution_mode: 'manual',
          triggered_by: user?.id,
          force: true
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Rappel chefs exécuté avec succès`, {
        description: data?.notified
          ? `${data.notified} notification(s) envoyée(s)`
          : "Aucune notification nécessaire",
      });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'exécution du rappel chefs", {
        description: error.message,
      });
    },
  });

  // Mutation pour lancer rappel-conducteurs
  const triggerRappelConducteurs = useMutation({
    mutationFn: async () => {
      // Récupérer l'utilisateur courant
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke("rappel-conducteurs", {
        body: {
          execution_mode: 'manual',
          triggered_by: user?.id,
          force: true
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Rappel conducteurs exécuté avec succès`, {
        description: data?.notified
          ? `${data.notified} notification(s) envoyée(s)`
          : "Aucune notification nécessaire",
      });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'exécution du rappel conducteurs", {
        description: error.message,
      });
    },
  });

  // Mutation pour lancer rappel-chefs-lundi
  const triggerRappelChefsLundi = useMutation({
    mutationFn: async () => {
      // Récupérer l'utilisateur courant
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke("rappel-chefs-lundi", {
        body: {
          execution_mode: 'manual',
          triggered_by: user?.id,
          force: true
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Rappel chefs lundi exécuté avec succès`, {
        description: data?.notified
          ? `${data.notified} notification(s) envoyée(s)`
          : "Aucune notification nécessaire",
      });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'exécution du rappel chefs lundi", {
        description: error.message,
      });
    },
  });

  // Mutation pour lancer rappel-conducteurs-finisseurs
  const triggerRappelConducteursFinisseurs = useMutation({
    mutationFn: async () => {
      // Récupérer l'utilisateur courant
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke("rappel-conducteurs-finisseurs", {
        body: {
          execution_mode: 'manual',
          triggered_by: user?.id,
          force: true
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Rappel conducteurs finisseurs exécuté avec succès`, {
        description: data?.notified
          ? `${data.notified} notification(s) envoyée(s)`
          : "Aucune notification nécessaire",
      });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'exécution du rappel conducteurs finisseurs", {
        description: error.message,
      });
    },
  });

  return {
    triggerRappelChefs: triggerRappelChefs.mutate,
    isExecutingChefs: triggerRappelChefs.isPending,
    triggerRappelConducteurs: triggerRappelConducteurs.mutate,
    isExecutingConducteurs: triggerRappelConducteurs.isPending,
    triggerRappelChefsLundi: triggerRappelChefsLundi.mutate,
    isExecutingChefsLundi: triggerRappelChefsLundi.isPending,
    triggerRappelConducteursFinisseurs: triggerRappelConducteursFinisseurs.mutate,
    isExecutingConducteursFinisseurs: triggerRappelConducteursFinisseurs.isPending,
  };
};
