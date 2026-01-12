import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDemandesCongesRH } from "@/hooks/useDemandesCongesRH";
import { useValidateDemandeConge } from "@/hooks/useValidateDemandeConge";
import { useRefuseDemandeConge } from "@/hooks/useRefuseDemandeConge";
import { useEnterpriseConfig } from "@/hooks/useEnterpriseConfig";
import { DemandeCongeCard } from "./DemandeCongeCard";
import { generateCongesPdf } from "@/lib/congesPdfExport";
import { useMarkDemandesExportees } from "@/hooks/useMarkDemandesExportees";
import { toast } from "sonner";

interface CongesRHSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepriseId: string;
}

export const CongesRHSheet = ({
  open,
  onOpenChange,
  entrepriseId,
}: CongesRHSheetProps) => {
  const [activeTab, setActiveTab] = useState("a-valider");
  const [showRefusDialog, setShowRefusDialog] = useState(false);
  const [selectedDemandeId, setSelectedDemandeId] = useState<string | null>(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { data: demandes = [], isLoading } = useDemandesCongesRH(entrepriseId);
  const validateMutation = useValidateDemandeConge();
  const refuseMutation = useRefuseDemandeConge();
  const markExporteesMutation = useMarkDemandesExportees();
  const enterpriseConfig = useEnterpriseConfig();

  // Récupérer l'ID de l'utilisateur connecté
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchUserId();
  }, []);

  // Demandes en attente de validation RH (après validation conducteur)
  const aValider = demandes.filter((d) => d.statut === "VALIDEE_CONDUCTEUR");
  // Demandes en attente de validation conducteur (pour suivi)
  const enAttenteConducteur = demandes.filter((d) => d.statut === "EN_ATTENTE");
  // Demandes traitées (validées RH ou refusées)
  const traitees = demandes.filter(
    (d) => d.statut === "VALIDEE_RH" || d.statut === "REFUSEE"
  );

  const handleValidate = async (demandeId: string) => {
    if (!currentUserId) return;
    await validateMutation.mutateAsync({
      demandeId,
      valideurId: currentUserId,
      role: "rh",
    });
  };

  const handleOpenRefus = (demandeId: string) => {
    setSelectedDemandeId(demandeId);
    setMotifRefus("");
    setShowRefusDialog(true);
  };

  const handleConfirmRefus = async () => {
    if (!selectedDemandeId || !currentUserId) return;
    await refuseMutation.mutateAsync({
      demandeId: selectedDemandeId,
      refuseurId: currentUserId,
      motifRefus: motifRefus || "",
    });
    setShowRefusDialog(false);
    setSelectedDemandeId(null);
    setMotifRefus("");
  };

  // TEMPORAIRE : Désactivé pour tests visuels PDF - inclut TOUTES les demandes validées
  const nonExportees = demandes.filter((d) => d.statut === "VALIDEE_RH");
  const nbNonExportees = nonExportees.length;

  const handleExportPdf = async () => {
    if (nbNonExportees === 0) {
      toast.info("Aucune demande validée à exporter");
      return;
    }
    try {
      await generateCongesPdf(nonExportees, {
        entrepriseNom: enterpriseConfig?.nom,
        entrepriseLogo: enterpriseConfig?.theme?.logo,
      });
      // TEMPORAIRE : Désactivé pour tests visuels PDF
      // await markExporteesMutation.mutateAsync(nonExportees.map((d) => d.id));
      toast.success(`${nbNonExportees} demande(s) exportée(s) en PDF`);
    } catch (error) {
      toast.error("Erreur lors de l'export PDF");
      console.error(error);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Gestion des congés
              {aValider.length > 0 && (
                <Badge variant="destructive">{aValider.length}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="a-valider" className="text-xs sm:text-sm">
                À valider
                {aValider.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {aValider.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="en-attente" className="text-xs sm:text-sm">
                Attente cond.
                {enAttenteConducteur.length > 0 && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {enAttenteConducteur.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="traitees" className="text-xs sm:text-sm">
                Traitées
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-200px)] mt-4">
              <TabsContent value="a-valider" className="space-y-3 mt-0">
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">
                    Chargement...
                  </p>
                ) : aValider.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune demande à valider
                  </p>
                ) : (
                  aValider.map((demande) => (
                    <DemandeCongeCard
                      key={demande.id}
                      demande={demande}
                      showActions
                      onValidate={() => handleValidate(demande.id)}
                      onRefuse={() => handleOpenRefus(demande.id)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="en-attente" className="space-y-3 mt-0">
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">
                    Chargement...
                  </p>
                ) : enAttenteConducteur.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune demande en attente conducteur
                  </p>
                ) : (
                  enAttenteConducteur.map((demande) => (
                    <DemandeCongeCard key={demande.id} demande={demande} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="traitees" className="space-y-3 mt-0">
                {/* Bouton export PDF - uniquement si demandes non exportées */}
                {nbNonExportees > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPdf}
                    className="w-full mb-3"
                    disabled={markExporteesMutation.isPending}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exporter {nbNonExportees} nouvelle(s) demande(s) en PDF
                  </Button>
                )}
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">
                    Chargement...
                  </p>
                ) : traitees.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune demande traitée
                  </p>
                ) : (
                  traitees.map((demande) => (
                    <DemandeCongeCard key={demande.id} demande={demande} />
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Dialog de refus */}
      <Dialog open={showRefusDialog} onOpenChange={setShowRefusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Motif du refus (optionnel)"
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefusDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRefus}
              disabled={refuseMutation.isPending}
            >
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
