import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, CalendarOff, Loader2 } from "lucide-react";
import { useDemandesConges } from "@/hooks/useDemandesConges";
import { useCreateDemandeConge } from "@/hooks/useCreateDemandeConge";
import { DemandeCongeCard } from "./DemandeCongeCard";
import { DemandeCongeForm, TypeConge, Employee } from "./DemandeCongeForm";
import { useMaconsByChantier } from "@/hooks/useMaconsByChantier";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CongesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chefId: string;
  chantierId: string;
  semaine: string;
  entrepriseId: string;
}

export const CongesSheet: React.FC<CongesSheetProps> = ({
  open,
  onOpenChange,
  chefId,
  chantierId,
  semaine,
  entrepriseId,
}) => {
  const [showForm, setShowForm] = useState(false);
  
  // Récupérer l'équipe du chef (maçons + chef)
  const { data: team = [], isLoading: teamLoading } = useMaconsByChantier(chantierId, semaine, chefId);
  
  // Récupérer les infos du chef (responsable)
  const { data: chefInfo, isLoading: chefLoading } = useQuery({
    queryKey: ["chef-info-conges", chefId],
    queryFn: async () => {
      if (!chefId) return null;
      const { data } = await supabase
        .from("utilisateurs")
        .select("nom, prenom")
        .eq("id", chefId)
        .single();
      return data || null;
    },
    enabled: !!chefId,
  });

  // Récupérer le nom du chantier
  const { data: chantierInfo } = useQuery({
    queryKey: ["chantier-info-conges", chantierId],
    queryFn: async () => {
      if (!chantierId) return null;
      const { data } = await supabase
        .from("chantiers")
        .select("nom")
        .eq("id", chantierId)
        .single();
      return data || null;
    },
    enabled: !!chantierId,
  });

  // Historique des demandes pour le chef (pour voir toutes les demandes qu'il a créées)
  const { data: demandes = [], isLoading: demandesLoading } = useDemandesConges(chefId);
  
  const createDemande = useCreateDemandeConge();

  // Transformer l'équipe en liste d'employés pour le formulaire
  const employees: Employee[] = team.map(m => ({
    id: m.id,
    nom: m.nom,
    prenom: m.prenom,
  }));

  const handleSubmit = async (data: {
    demandeur_id: string;
    type_conge: TypeConge;
    date_debut: string;
    date_fin: string;
    motif?: string;
    signature_data?: string;
  }) => {
    await createDemande.mutateAsync({
      demandeur_id: data.demandeur_id,
      entreprise_id: entrepriseId,
      type_conge: data.type_conge,
      date_debut: data.date_debut,
      date_fin: data.date_fin,
      motif: data.motif,
      signature_data: data.signature_data,
    });
    setShowForm(false);
  };

  const isLoading = teamLoading || chefLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Demandes de congés
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : showForm ? (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <DemandeCongeForm
              employees={employees}
              responsable={{
                nom: chefInfo?.nom || "",
                prenom: chefInfo?.prenom || "",
              }}
              chantierNom={chantierInfo?.nom}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              isSubmitting={createDemande.isPending}
            />
          </ScrollArea>
        ) : (
          <>
            <Button
              onClick={() => setShowForm(true)}
              className="w-full mb-4"
              disabled={employees.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle demande
            </Button>

            {employees.length === 0 && (
              <p className="text-sm text-muted-foreground text-center mb-4">
                Aucun employé dans l'équipe pour ce chantier.
              </p>
            )}

            <ScrollArea className="flex-1 -mx-6 px-6">
              {demandesLoading ? (
                <p className="text-center text-muted-foreground py-8">
                  Chargement...
                </p>
              ) : demandes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune demande de congé</p>
                  <p className="text-sm mt-1">
                    Cliquez sur "Nouvelle demande" pour en créer une
                  </p>
                </div>
              ) : (
                demandes.map((demande) => (
                  <DemandeCongeCard key={demande.id} demande={demande} />
                ))
              )}
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
