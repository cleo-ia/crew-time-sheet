import React, { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CalendarOff, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { useDemandesConges } from "@/hooks/useDemandesConges";
import { useValidateDemandeConge } from "@/hooks/useValidateDemandeConge";
import { useRefuseDemandeConge } from "@/hooks/useRefuseDemandeConge";
import { useCreateDemandeConge } from "@/hooks/useCreateDemandeConge";
import { DemandeCongeCard } from "./DemandeCongeCard";
import { DemandeCongeForm, TypeConge, Employee } from "./DemandeCongeForm";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEntrepriseId } from "@/hooks/useCurrentEntrepriseId";
import { useFinisseursByConducteur } from "@/hooks/useFinisseursByConducteur";
import { getCurrentWeek } from "@/lib/weekUtils";
import type { DemandeConge } from "@/hooks/useDemandesConges";

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
  const [mode, setMode] = useState<"list" | "new">("list");

  const { data: entrepriseId } = useCurrentEntrepriseId();
  const currentWeek = getCurrentWeek();
  
  // Récupérer les finisseurs du conducteur
  const { data: finisseurs = [] } = useFinisseursByConducteur(conducteurId, currentWeek);

  // Récupérer les infos du conducteur
  const { data: conducteurInfo } = useQuery({
    queryKey: ["conducteur-info", conducteurId],
    queryFn: async () => {
      const { data } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom")
        .eq("id", conducteurId)
        .maybeSingle();
      return data;
    },
    enabled: !!conducteurId,
  });

  // Construire la liste des IDs : conducteur + finisseurs
  const allManagedIds = useMemo(() => {
    const ids = finisseurs.map(f => f.id);
    if (conducteurId && !ids.includes(conducteurId)) {
      ids.push(conducteurId);
    }
    return ids;
  }, [finisseurs, conducteurId]);

  // Demandes à valider (créées par les chefs, en attente)
  const { data: demandesAValider = [], isLoading: loadingAValider } = useDemandesConges();
  
  // Demandes créées par le conducteur (pour lui ou ses finisseurs)
  const { data: mesDemandes = [], isLoading: loadingMesDemandes } = useQuery({
    queryKey: ["demandes-conges-conducteur", allManagedIds],
    queryFn: async () => {
      if (allManagedIds.length === 0) return [];
      const { data, error } = await supabase
        .from("demandes_conges")
        .select(`
          *,
          demandeur:utilisateurs!demandes_conges_demandeur_id_fkey(id, nom, prenom)
        `)
        .in("demandeur_id", allManagedIds)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Erreur chargement mes demandes congés:", error);
        throw error;
      }
      return (data || []) as DemandeConge[];
    },
    enabled: allManagedIds.length > 0,
  });

  const validateMutation = useValidateDemandeConge();
  const refuseMutation = useRefuseDemandeConge();
  const createDemande = useCreateDemandeConge();

  // Filtrer les demandes par statut
  const demandesEnAttente = demandesAValider.filter((d) => d.statut === "EN_ATTENTE");
  const demandesTraitees = demandesAValider.filter((d) => d.statut !== "EN_ATTENTE");

  // Liste des employés pour le formulaire (conducteur + finisseurs)
  const employeesForForm: Employee[] = useMemo(() => {
    const list: Employee[] = [];
    
    // Ajouter le conducteur lui-même
    if (conducteurInfo) {
      list.push({
        id: conducteurInfo.id,
        nom: conducteurInfo.nom || "",
        prenom: conducteurInfo.prenom || "",
      });
    }
    
    // Ajouter les finisseurs
    finisseurs.forEach(f => {
      if (!list.some(e => e.id === f.id)) {
        list.push({
          id: f.id,
          nom: f.nom || "",
          prenom: f.prenom || "",
        });
      }
    });
    
    return list;
  }, [conducteurInfo, finisseurs]);

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

  const handleFormSubmit = (data: {
    demandeur_id: string;
    type_conge: TypeConge;
    date_debut: string;
    date_fin: string;
    motif?: string;
    signature_data?: string;
  }) => {
    if (!entrepriseId) return;
    
    createDemande.mutate(
      {
        demandeur_id: data.demandeur_id,
        entreprise_id: entrepriseId,
        type_conge: data.type_conge,
        date_debut: data.date_debut,
        date_fin: data.date_fin,
        motif: data.motif,
        signature_data: data.signature_data,
      },
      {
        onSuccess: () => {
          setMode("list");
          setActiveTab("mes-demandes");
        },
      }
    );
  };

  const handleCancel = () => {
    setMode("list");
  };

  const isProcessing = validateMutation.isPending || refuseMutation.isPending;
  const isLoading = loadingAValider || loadingMesDemandes;

  // Reset mode when sheet closes
  React.useEffect(() => {
    if (!open) {
      setMode("list");
    }
  }, [open]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              {mode === "new" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMode("list")}
                  className="h-8 w-8 mr-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <CalendarOff className="h-5 w-5" />
              {mode === "new" ? "Nouvelle demande" : "Demandes de congés"}
            </SheetTitle>
          </SheetHeader>

          {mode === "new" ? (
            <ScrollArea className="flex-1">
              <DemandeCongeForm
                employees={employeesForForm}
                responsable={{ nom: "RH", prenom: "" }}
                onSubmit={handleFormSubmit}
                onCancel={handleCancel}
                isSubmitting={createDemande.isPending}
              />
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Bouton Nouvelle demande en haut */}
              <Button
                variant="outline"
                onClick={() => setMode("new")}
                className="w-full mb-4 py-6 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-medium"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nouvelle demande
              </Button>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="en-attente" className="relative text-xs">
                    À valider
                    {demandesEnAttente.length > 0 && (
                      <span className="ml-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                        {demandesEnAttente.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="traitees" className="text-xs">Traitées</TabsTrigger>
                  <TabsTrigger value="mes-demandes" className="text-xs">Mes demandes</TabsTrigger>
                </TabsList>

              <TabsContent value="en-attente" className="flex-1 mt-4">
                <ScrollArea className="h-[calc(100vh-220px)]">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
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
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
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

              <TabsContent value="mes-demandes" className="flex-1 mt-4">
                <ScrollArea className="h-[calc(100vh-220px)]">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : mesDemandes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Aucune demande créée</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMode("new")}
                        className="mt-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Créer une demande
                      </Button>
                    </div>
                  ) : (
                    mesDemandes.map((demande) => (
                      <DemandeCongeCard key={demande.id} demande={demande} />
                    ))
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
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
