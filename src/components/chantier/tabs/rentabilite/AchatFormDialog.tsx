import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Info, Upload, X, FileText, ImageIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCreateAchat, useUpdateAchat, Achat, AchatInsert } from "@/hooks/useAchatsChantier";
import { useTachesChantier } from "@/hooks/useTachesChantier";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addFactureToDocuments, removeFactureFromDocuments } from "@/hooks/useFacturesDossier";
import { PDFViewer } from "@/components/shared/PDFViewer";

const TYPES_COUT = ["Matériaux", "Fournitures", "Locations", "Sous traitants", "Autres"];
const UNITES = ["m2", "unité", "jour", "m3", "kg", "tonne", "mètre", "litre"];

interface AchatFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chantierId: string;
  achat?: Achat | null;
}

export const AchatFormDialog = ({ open, onOpenChange, chantierId, achat }: AchatFormDialogProps) => {
  const isEditing = !!achat;
  const createAchat = useCreateAchat();
  const updateAchat = useUpdateAchat();
  const { data: taches = [] } = useTachesChantier(chantierId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [typeCout, setTypeCout] = useState(achat?.type_cout || "Matériaux");
  const [nom, setNom] = useState(achat?.nom || "");
  const [fournisseur, setFournisseur] = useState(achat?.fournisseur || "");
  const [quantite, setQuantite] = useState(achat?.quantite?.toString() || "1");
  const [prixUnitaire, setPrixUnitaire] = useState(achat?.prix_unitaire?.toString() || "");
  const [unite, setUnite] = useState(achat?.unite || "m2");
  const [date, setDate] = useState<Date | undefined>(achat?.date ? new Date(achat.date) : new Date());
  const [tacheId, setTacheId] = useState<string | null>(achat?.tache_id || null);
  const [factureName, setFactureName] = useState(achat?.facture_name || "");
  const [facturePath, setFacturePath] = useState(achat?.facture_path || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);

  // Synchronize form state when achat changes (for edit mode)
  useEffect(() => {
    if (open) {
      if (achat) {
        setTypeCout(achat.type_cout || "Matériaux");
        setNom(achat.nom || "");
        setFournisseur(achat.fournisseur || "");
        setQuantite(achat.quantite?.toString() || "1");
        setPrixUnitaire(achat.prix_unitaire?.toString() || "");
        setUnite(achat.unite || "m2");
        setDate(achat.date ? new Date(achat.date) : new Date());
        setTacheId(achat.tache_id || null);
        setFactureName(achat.facture_name || "");
        setFacturePath(achat.facture_path || "");
      } else {
        resetForm();
      }
    }
  }, [achat, open]);

  // Calculate montant automatically
  const calculatedMontant = (parseFloat(quantite) || 0) * (parseFloat(prixUnitaire) || 0);

  const resetForm = () => {
    setTypeCout("Matériaux");
    setNom("");
    setFournisseur("");
    setQuantite("1");
    setPrixUnitaire("");
    setUnite("m2");
    setDate(new Date());
    setTacheId(null);
    setFactureName("");
    setFacturePath("");
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez PDF, JPG ou PNG.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 10 Mo");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${chantierId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chantiers-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Add to central Fichiers tab in "Factures" folder
      await addFactureToDocuments(chantierId, file.name, fileName, file.type, file.size);

      setFacturePath(fileName);
      setFactureName(file.name);
      toast.success("Facture uploadée");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleRemoveFile = async () => {
    // Remove from central Fichiers if file was already uploaded
    if (facturePath) {
      await removeFactureFromDocuments(facturePath);
    }
    setFactureName("");
    setFacturePath("");
  };

  const handleSubmit = async () => {
    if (!nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    if (!prixUnitaire || isNaN(parseFloat(prixUnitaire))) {
      toast.error("Le prix unitaire est requis");
      return;
    }

    const achatData: AchatInsert = {
      chantier_id: chantierId,
      tache_id: tacheId,
      nom: nom.trim(),
      fournisseur: fournisseur.trim() || null,
      quantite: parseFloat(quantite) || 1,
      prix_unitaire: parseFloat(prixUnitaire),
      montant: calculatedMontant,
      unite: unite,
      date: date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      type_cout: typeCout,
      facture_path: facturePath || null,
      facture_name: factureName || null,
    };

    if (isEditing && achat) {
      await updateAchat.mutateAsync({ id: achat.id, chantierId, updates: achatData });
    } else {
      await createAchat.mutateAsync(achatData);
    }

    resetForm();
    onOpenChange(false);
  };

  const isPending = createAchat.isPending || updateAchat.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? "Modifier l'achat" : "Ajouter un achat rapide"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Type de coûts */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Type de couts</Label>
            <div className="flex flex-wrap gap-2">
              {TYPES_COUT.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={typeCout === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeCout(type)}
                  className={cn(
                    "rounded-full px-4",
                    typeCout === type && "bg-foreground text-background hover:bg-foreground/90"
                  )}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="nom" className="text-sm font-medium">Nom</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Exemple : Cables électricité"
              autoComplete="off"
            />
          </div>

          {/* Fournisseur */}
          <div className="space-y-2">
            <Label htmlFor="fournisseur" className="text-sm font-medium">Fournisseur</Label>
            <Input
              id="fournisseur"
              value={fournisseur}
              onChange={(e) => setFournisseur(e.target.value)}
              placeholder="Fournisseur"
            />
          </div>

          {/* Quantité + Unité */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantite" className="text-sm font-medium">Quantité</Label>
              <Input
                id="quantite"
                type="number"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                placeholder="1"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Unité</Label>
              <Select value={unite} onValueChange={setUnite}>
                <SelectTrigger>
                  <SelectValue placeholder="Unité" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {UNITES.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prix unitaire */}
          <div className="space-y-2">
            <Label htmlFor="prix_unitaire" className="text-sm font-medium">Prix unitaire (€/{unite})</Label>
            <Input
              id="prix_unitaire"
              type="number"
              value={prixUnitaire}
              onChange={(e) => setPrixUnitaire(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {/* Montant total calculé */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Montant total</span>
              <span className="text-lg font-semibold">{calculatedMontant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yy", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={fr}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Facture upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Facture</Label>
            {factureName ? (
              <div className="flex gap-3">
                {/* File card */}
                <div 
                  className="group relative w-[140px] bg-card border border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => {
                    const isPdf = factureName.toLowerCase().endsWith(".pdf");
                    if (isPdf) {
                      setShowPdfViewer(true);
                    } else {
                      setShowImageViewer(true);
                    }
                  }}
                >
                  {/* Preview area */}
                  <div className="h-24 bg-muted/30 flex items-center justify-center relative">
                    {factureName.toLowerCase().endsWith(".pdf") ? (
                      <div className="flex flex-col items-center gap-1">
                        <FileText className="h-10 w-10 text-red-500" />
                        <span className="text-xs font-medium text-red-500">PDF</span>
                      </div>
                    ) : (
                      <img
                        src={supabase.storage.from("chantiers-documents").getPublicUrl(facturePath).data.publicUrl}
                        alt={factureName}
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {/* Delete button - visible on hover */}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* File name */}
                  <div className="p-2 border-t border-border">
                    <p className="text-xs truncate text-muted-foreground" title={factureName}>
                      {factureName}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  isDragOver ? "border-primary bg-primary/5" : "border-orange-200 bg-orange-50/50",
                  isUploading && "opacity-50 pointer-events-none"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <p className="text-sm text-muted-foreground">
                  {isUploading ? "Upload en cours..." : "Insérez votre facture ici (format accepté : pdf, jpg, png)"}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </div>
            )}

            {/* PDF Viewer Modal */}
            {showPdfViewer && facturePath && (
              <Dialog open={showPdfViewer} onOpenChange={setShowPdfViewer}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                  <PDFViewer url={supabase.storage.from("chantiers-documents").getPublicUrl(facturePath).data.publicUrl} />
                </DialogContent>
              </Dialog>
            )}

            {/* Image Viewer Modal */}
            {showImageViewer && facturePath && (
              <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
                <DialogContent className="max-w-4xl">
                  <img
                    src={supabase.storage.from("chantiers-documents").getPublicUrl(facturePath).data.publicUrl}
                    alt={factureName}
                    className="w-full h-auto max-h-[80vh] object-contain"
                  />
                </DialogContent>
              </Dialog>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>Optionnel</span>
            </div>
          </div>

          {/* Lier à une tâche */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Lier à une tâche</Label>
            <Select value={tacheId || "none"} onValueChange={(v) => setTacheId(v === "none" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisissez une tâche" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="none">Aucune tâche</SelectItem>
                {taches.map((tache) => (
                  <SelectItem key={tache.id} value={tache.id}>{tache.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>Optionnel</span>
            </div>
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isPending ? "En cours..." : isEditing ? "Modifier l'achat" : "Ajouter l'achat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
