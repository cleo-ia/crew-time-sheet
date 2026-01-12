import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, CalendarOff } from "lucide-react";
import { useDemandesConges } from "@/hooks/useDemandesConges";
import { useCreateDemandeConge } from "@/hooks/useCreateDemandeConge";
import { DemandeCongeCard } from "./DemandeCongeCard";
import { DemandeCongeForm, TypeConge, DemandeurInfo } from "./DemandeCongeForm";

interface CongesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandeurId: string;
  entrepriseId: string;
  demandeurInfo?: DemandeurInfo;
}

export const CongesSheet: React.FC<CongesSheetProps> = ({
  open,
  onOpenChange,
  demandeurId,
  entrepriseId,
  demandeurInfo,
}) => {
  const [showForm, setShowForm] = useState(false);
  const { data: demandes = [], isLoading } = useDemandesConges(demandeurId);
  const createDemande = useCreateDemandeConge();

  const handleSubmit = async (data: {
    type_conge: TypeConge;
    date_debut: string;
    date_fin: string;
    motif?: string;
    signature_data?: string;
  }) => {
    await createDemande.mutateAsync({
      demandeur_id: demandeurId,
      entreprise_id: entrepriseId,
      ...data,
    });
    setShowForm(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Mes demandes de congés
          </SheetTitle>
        </SheetHeader>

        {showForm ? (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <DemandeCongeForm
              demandeur={demandeurInfo}
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
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle demande
            </Button>

            <ScrollArea className="flex-1 -mx-6 px-6">
              {isLoading ? (
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
