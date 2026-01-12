import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarOff } from "lucide-react";
import { useDemandesConges } from "@/hooks/useDemandesConges";
import { useValidateDemandeConge } from "@/hooks/useValidateDemandeConge";
import { useRefuseDemandeConge } from "@/hooks/useRefuseDemandeConge";
import { DemandeCongeCard } from "./DemandeCongeCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CongesListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conducteurId: string;
}

export const CongesListSheet: React.FC<CongesListSheetProps> = ({
  open,
  onOpenChange,
  conducteurId,
}) => {
  const [activeTab, setActiveTab] = useState("en-attente");
  const [refuseDialogOpen, setRefuseDialogOpen] = useState(false);
  const [selectedDemandeId, setSelectedDemandeId] = useState<string | null>(null);
  const [motifRefus, setMotifRefus] = useState("");

  const { data: demandes = [], isLoading } = useDemandesConges();
  const validateMutation = useValidateDemandeConge();
  const refuseMutation = useRefuseDemandeConge();

  // Filtrer les demandes par statut
  const demandesEnAttente = demandes.filter((d) => d.statut === "EN_ATTENTE");
  const demandesTraitees = demandes.filter((d) => d.statut !== "EN_ATTENTE");

  const handleValidate = (demandeId: string) => {
    validateMutation.mutate({
      demandeId,
      valideurId: conducteurId,
      role: "conducteur",
    });
  };

  const handleRefuseClick = (demandeId: string) => {
    setSelectedDemandeId(demandeId);
    setMotifRefus("");
    setRefuseDialogOpen(true);
  };

  const handleConfirmRefuse = () => {
    if (!selectedDemandeId || !motifRefus.trim()) return;
    
    refuseMutation.mutate({
      demandeId: selectedDemandeId,
      refuseurId: conducteurId,
      motifRefus: motifRefus.trim(),
    });
    
    setRefuseDialogOpen(false);
    setSelectedDemandeId(null);
    setMotifRefus("");
  };

  const isProcessing = validateMutation.isPending || refuseMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5" />
              Demandes de congés
            </SheetTitle>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="en-attente" className="relative">
                À valider
                {demandesEnAttente.length > 0 && (
                  <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                    {demandesEnAttente.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="traitees">Traitées</TabsTrigger>
            </TabsList>

            <TabsContent value="en-attente" className="flex-1 mt-4">
              <ScrollArea className="h-[calc(100vh-220px)]">
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">
                    Chargement...
                  </p>
                ) : demandesEnAttente.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune demande en attente</p>
                  </div>
                ) : (
                  demandesEnAttente.map((demande) => (
                    <DemandeCongeCard
                      key={demande.id}
                      demande={demande}
                      showActions
                      onValidate={handleValidate}
                      onRefuse={handleRefuseClick}
                      isValidating={isProcessing}
                    />
                  ))
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="traitees" className="flex-1 mt-4">
              <ScrollArea className="h-[calc(100vh-220px)]">
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">
                    Chargement...
                  </p>
                ) : demandesTraitees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune demande traitée</p>
                  </div>
                ) : (
                  demandesTraitees.map((demande) => (
                    <DemandeCongeCard key={demande.id} demande={demande} />
                  ))
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Dialog de refus avec motif obligatoire */}
      <AlertDialog open={refuseDialogOpen} onOpenChange={setRefuseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refuser la demande de congé</AlertDialogTitle>
            <AlertDialogDescription>
              Veuillez indiquer le motif du refus. Cette information sera
              transmise au demandeur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Label htmlFor="motif-refus">Motif du refus</Label>
            <Textarea
              id="motif-refus"
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              placeholder="Ex: Période de forte activité, effectif minimum requis..."
              rows={3}
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRefuse}
              disabled={!motifRefus.trim() || refuseMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer le refus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
