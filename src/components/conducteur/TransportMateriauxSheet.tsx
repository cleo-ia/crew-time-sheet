import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Plus, Send, Save, Package, Truck, MapPin, User, History, FilePlus } from "lucide-react";
import { format, getISOWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useChantiers } from "@/hooks/useChantiers";
import { useCurrentEntrepriseId } from "@/hooks/useCurrentEntrepriseId";
import {
  useCreateFicheTransportMateriaux,
  useUpdateFicheTransportMateriaux,
  useFichesTransportMateriaux,
  type LigneMateriau,
} from "@/hooks/useFichesTransportMateriaux";
import { useSendTransportMateriaux } from "@/hooks/useSendTransportMateriaux";
import { TransportMateriauxLigneRow } from "./TransportMateriauxLigneRow";
import { TransportMateriauxHistorique } from "./TransportMateriauxHistorique";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface TransportMateriauxSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conducteurId: string;
  ficheId?: string; // Pour édition
}

const MOYENS_TRANSPORT = ["Camion grue", "Semi", "Fourgon", "Autre"];

const emptyLigne = (): LigneMateriau => ({
  categorie: "Matériel",
  designation: "",
  unite: "U",
  quantite: 1,
});

export const TransportMateriauxSheet = ({
  open,
  onOpenChange,
  conducteurId,
  ficheId,
}: TransportMateriauxSheetProps) => {
  const { toast } = useToast();
  const { data: entrepriseId } = useCurrentEntrepriseId();
  const { data: chantiers = [] } = useChantiers();
  const { data: fiches = [], isLoading: fichesLoading } = useFichesTransportMateriaux(conducteurId);

  const createFiche = useCreateFicheTransportMateriaux();
  const updateFiche = useUpdateFicheTransportMateriaux();
  const sendFiche = useSendTransportMateriaux();

  // État des onglets
  const [activeTab, setActiveTab] = useState("nouvelle");
  
  // État du formulaire
  const [chantierId, setChantierId] = useState<string>("");
  const [jourLivraison, setJourLivraison] = useState<Date | undefined>(undefined);
  const [moyenTransport, setMoyenTransport] = useState("Camion grue");
  const [responsableDepot, setResponsableDepot] = useState("");
  const [lignes, setLignes] = useState<LigneMateriau[]>([emptyLigne()]);
  const [currentFicheId, setCurrentFicheId] = useState<string | null>(null);
  const [statut, setStatut] = useState("BROUILLON");

  // Charger les chantiers actifs
  const chantiersActifs = useMemo(() => 
    chantiers.filter(c => c.actif !== false),
    [chantiers]
  );

  // Chantier sélectionné avec ses infos
  const selectedChantier = useMemo(() => 
    chantiersActifs.find(c => c.id === chantierId),
    [chantiersActifs, chantierId]
  );

  // Calcul automatique de la semaine
  const semaineLivraison = useMemo(() => 
    jourLivraison ? getISOWeek(jourLivraison) : null,
    [jourLivraison]
  );

  // Reset le formulaire
  const resetForm = () => {
    setChantierId("");
    setJourLivraison(undefined);
    setMoyenTransport("Camion grue");
    setResponsableDepot("");
    setLignes([emptyLigne()]);
    setCurrentFicheId(null);
    setStatut("BROUILLON");
  };

  // Reset le formulaire à l'ouverture
  useEffect(() => {
    if (open && !ficheId) {
      resetForm();
      setActiveTab("nouvelle");
    }
  }, [open, ficheId]);

  // Charger une fiche existante pour édition
  useEffect(() => {
    if (ficheId && fiches.length > 0) {
      const fiche = fiches.find((f: any) => f.id === ficheId);
      if (fiche) {
        loadFiche(fiche);
        setActiveTab("nouvelle");
      }
    }
  }, [ficheId, fiches]);

  // Charger une fiche dans le formulaire
  const loadFiche = (fiche: any) => {
    setChantierId(fiche.chantier_id);
    setJourLivraison(new Date(fiche.jour_livraison));
    setMoyenTransport(fiche.moyen_transport || "Camion grue");
    setResponsableDepot(fiche.responsable_depot || "");
    setLignes(fiche.lignes?.length > 0 ? fiche.lignes : [emptyLigne()]);
    setCurrentFicheId(fiche.id);
    setStatut(fiche.statut);
  };

  // Sélection d'une fiche depuis l'historique
  const handleSelectFiche = (selectedFicheId: string) => {
    const fiche = fiches.find((f: any) => f.id === selectedFicheId);
    if (fiche) {
      loadFiche(fiche);
      setActiveTab("nouvelle");
    }
  };

  // Créer une nouvelle demande depuis l'historique
  const handleNewRequest = () => {
    resetForm();
    setActiveTab("nouvelle");
  };

  // Gestion des lignes
  const handleAddLigne = () => {
    setLignes([...lignes, emptyLigne()]);
  };

  const handleRemoveLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  const handleLigneChange = (index: number, field: keyof LigneMateriau, value: string | number) => {
    setLignes(lignes.map((ligne, i) => 
      i === index ? { ...ligne, [field]: value } : ligne
    ));
  };

  // Validation
  const isValid = useMemo(() => {
    if (!chantierId || !jourLivraison || !semaineLivraison) return false;
    const hasValidLignes = lignes.some(l => l.designation.trim().length > 0);
    return hasValidLignes;
  }, [chantierId, jourLivraison, semaineLivraison, lignes]);

  // Enregistrer brouillon
  const handleSave = async () => {
    if (!jourLivraison || !semaineLivraison || !entrepriseId) return;

    const validLignes = lignes.filter(l => l.designation.trim().length > 0);

    try {
      if (currentFicheId) {
        await updateFiche.mutateAsync({
          id: currentFicheId,
          chantier_id: chantierId,
          semaine_livraison: semaineLivraison,
          jour_livraison: format(jourLivraison, "yyyy-MM-dd"),
          moyen_transport: moyenTransport,
          responsable_depot: responsableDepot || null,
          statut: "BROUILLON",
          lignes: validLignes,
        });
      } else {
        const newFiche = await createFiche.mutateAsync({
          chantier_id: chantierId,
          conducteur_id: conducteurId,
          semaine_livraison: semaineLivraison,
          jour_livraison: format(jourLivraison, "yyyy-MM-dd"),
          moyen_transport: moyenTransport,
          responsable_depot: responsableDepot || null,
          statut: "BROUILLON",
          lignes: validLignes,
        });
        setCurrentFicheId(newFiche.id);
      }

      toast({
        title: "✅ Brouillon enregistré",
        description: "La fiche a été sauvegardée.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ Erreur",
        description: error.message || "Impossible d'enregistrer la fiche.",
      });
    }
  };

  // Transmettre au dépôt
  const handleSend = async () => {
    if (!isValid) return;

    try {
      // D'abord sauvegarder
      await handleSave();

      // Puis envoyer
      if (currentFicheId) {
        await sendFiche.mutateAsync({ ficheId: currentFicheId });
        setStatut("TRANSMISE");
        onOpenChange(false);
      }
    } catch (error) {
      // Erreur déjà gérée dans useSendTransportMateriaux
    }
  };

  const isTransmise = statut === "TRANSMISE";
  const fichesCount = fiches.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">Transport matériaux</SheetTitle>
              <SheetDescription>
                Gérer vos demandes de livraison
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 grid grid-cols-2">
            <TabsTrigger value="nouvelle" className="flex items-center gap-2">
              <FilePlus className="h-4 w-4" />
              {currentFicheId ? "Édition" : "Nouvelle demande"}
            </TabsTrigger>
            <TabsTrigger value="historique" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historique
              {fichesCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {fichesCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nouvelle" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
            {isTransmise && (
              <div className="px-6 pt-4">
                <Badge variant="secondary" className="w-fit bg-primary/10 text-primary">
                  ✅ Fiche transmise au dépôt
                </Badge>
              </div>
            )}
            
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-6">
                {/* Section 1: Informations générales */}
                <Card className="p-4 space-y-4">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Informations du chantier
                  </h3>

                  {/* Sélection du chantier */}
                  <div className="space-y-2">
                    <Label>Chantier de destination</Label>
                    <Select value={chantierId} onValueChange={setChantierId} disabled={isTransmise}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un chantier..." />
                      </SelectTrigger>
                      <SelectContent>
                        {chantiersActifs.map((chantier) => (
                          <SelectItem key={chantier.id} value={chantier.id}>
                            {chantier.code_chantier ? `${chantier.code_chantier} - ` : ""}{chantier.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Infos auto-remplies */}
                  {selectedChantier && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                      <div>
                        <span className="text-muted-foreground">Ville:</span>
                        <p className="font-medium">{selectedChantier.ville || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Adresse:</span>
                        <p className="font-medium">{selectedChantier.adresse || "—"}</p>
                      </div>
                    </div>
                  )}

                  {/* Date et semaine */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Jour de livraison</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !jourLivraison && "text-muted-foreground"
                            )}
                            disabled={isTransmise}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {jourLivraison ? format(jourLivraison, "PPP", { locale: fr }) : "Choisir une date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={jourLivraison}
                            onSelect={setJourLivraison}
                            initialFocus
                            locale={fr}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Semaine de livraison</Label>
                      <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
                        <span className="font-medium">
                          {semaineLivraison ? `S${semaineLivraison}` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Moyen de transport et responsable */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Moyen de transport</Label>
                      <Select value={moyenTransport} onValueChange={setMoyenTransport} disabled={isTransmise}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MOYENS_TRANSPORT.map((moyen) => (
                            <SelectItem key={moyen} value={moyen}>
                              {moyen}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Responsable dépôt
                      </Label>
                      <Input
                        value={responsableDepot}
                        onChange={(e) => setResponsableDepot(e.target.value)}
                        placeholder="Ex: Fabrice"
                        disabled={isTransmise}
                      />
                    </div>
                  </div>
                </Card>

                {/* Section 2: Liste des matériaux */}
                <Card className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm uppercase text-muted-foreground flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Liste des matériaux
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddLigne}
                      disabled={isTransmise}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>

                  {/* En-tête tableau */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase border-b pb-2">
                    <div className="col-span-2">Catégorie</div>
                    <div className="col-span-5">Désignation</div>
                    <div className="col-span-2">Unité</div>
                    <div className="col-span-2 text-center">Qté</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Lignes */}
                  <div className="space-y-1">
                    {lignes.map((ligne, index) => (
                      <TransportMateriauxLigneRow
                        key={index}
                        ligne={ligne}
                        index={index}
                        onChange={handleLigneChange}
                        onRemove={handleRemoveLigne}
                        disabled={isTransmise}
                      />
                    ))}
                  </div>

                  {lignes.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      Aucun matériau ajouté. Cliquez sur "Ajouter" pour commencer.
                    </div>
                  )}
                </Card>
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="border-t px-6 py-4 flex gap-3 bg-muted/30">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSave}
                disabled={!chantierId || !jourLivraison || createFiche.isPending || updateFiche.isPending || isTransmise}
              >
                <Save className="h-4 w-4 mr-2" />
                Enregistrer brouillon
              </Button>
              <Button
                className="flex-1"
                onClick={handleSend}
                disabled={!isValid || sendFiche.isPending || isTransmise}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendFiche.isPending ? "Envoi en cours..." : "Transmettre au dépôt"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="historique" className="flex-1 flex flex-col overflow-hidden mt-0 px-6 py-4 data-[state=inactive]:hidden">
            <TransportMateriauxHistorique
              fiches={fiches as any}
              onSelectFiche={handleSelectFiche}
              isLoading={fichesLoading}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
