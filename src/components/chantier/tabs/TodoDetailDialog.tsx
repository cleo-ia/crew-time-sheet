import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Upload, FileText, Image as ImageIcon, Download, ExternalLink, MoreVertical, Calendar, CheckCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TodoChantier } from "@/hooks/useTodosChantier";
import { useUpdateTodo } from "@/hooks/useUpdateTodo";
import { useDeleteTodo } from "@/hooks/useDeleteTodo";
import { useTodoDocuments, TodoDocument } from "@/hooks/useTodoDocuments";
import { PDFViewer } from "@/components/shared/PDFViewer";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TodoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: TodoChantier;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

const isImageFile = (fileType: string) => fileType.startsWith("image/");

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return <ImageIcon className="h-8 w-8 text-muted-foreground" />;
  }
  if (fileType === "application/pdf") {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  return <FileText className="h-8 w-8 text-muted-foreground" />;
};

const getSmallFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4 text-green-600 flex-shrink-0" />;
  }
  if (fileType === "application/pdf") {
    return <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
};

const formatFileDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, "d MMM yyyy", { locale: fr });
};

export const TodoDetailDialog = ({ open, onOpenChange, todo }: TodoDetailDialogProps) => {
  const [nom, setNom] = useState(todo.nom);
  const [description, setDescription] = useState(todo.description || "");
  const [statut, setStatut] = useState(todo.statut);
  const [priorite, setPriorite] = useState(todo.priorite || "NORMALE");
  const [dateEcheance, setDateEcheance] = useState(todo.date_echeance || "");
  const [afficherPlanning, setAfficherPlanning] = useState(todo.afficher_planning ?? false);
  const [docToDelete, setDocToDelete] = useState<TodoDocument | null>(null);
  const [pdfToView, setPdfToView] = useState<TodoDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const { documents, isLoading: docsLoading, uploadDocument, deleteDocument, getPublicUrl } = useTodoDocuments(todo.id);

  // Reset form when todo changes
  useEffect(() => {
    setNom(todo.nom);
    setDescription(todo.description || "");
    setStatut(todo.statut);
    setPriorite(todo.priorite || "NORMALE");
    setDateEcheance(todo.date_echeance || "");
    setAfficherPlanning(todo.afficher_planning ?? false);
  }, [todo]);

  // Calculer si le todo est "en cours" dynamiquement (inclut les retards)
  const isEnCours = useMemo(() => {
    if (statut === "TERMINE") return false;
    if (!dateEcheance) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateEcheance);
    dueDate.setHours(0, 0, 0, 0);
    
    // En cours = aujourd'hui OU en retard (date passée)
    return dueDate <= today;
  }, [statut, dateEcheance]);

  const handleValidateTodo = async () => {
    await updateTodo.mutateAsync({
      id: todo.id,
      chantier_id: todo.chantier_id,
      statut: "TERMINE"
    });
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!nom.trim()) return;

    await updateTodo.mutateAsync({
      id: todo.id,
      chantier_id: todo.chantier_id,
      nom: nom.trim(),
      description: description.trim() || null,
      statut,
      priorite: priorite as any,
      date_echeance: dateEcheance || null,
      afficher_planning: afficherPlanning && !!dateEcheance,
    });

    onOpenChange(false);
  };

  const handleDelete = async () => {
    await deleteTodo.mutateAsync({
      id: todo.id,
      chantier_id: todo.chantier_id,
    });
    onOpenChange(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} dépasse la taille maximale de 10 MB`);
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: type de fichier non supporté`);
        continue;
      }
      await uploadDocument.mutateAsync({ file, todoId: todo.id, chantierId: todo.chantier_id });
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteDocument = async () => {
    if (docToDelete) {
      await deleteDocument.mutateAsync(docToDelete);
      setDocToDelete(null);
    }
  };

  const handleOpenDocument = (doc: TodoDocument) => {
    // Pour les PDFs, ouvrir dans une modal intégrée
    if (doc.file_type === "application/pdf") {
      setPdfToView(doc);
      return;
    }
    
    // Pour les autres fichiers (images), ouvrir directement
    const url = getPublicUrl(doc.file_path);
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async (doc: TodoDocument) => {
    try {
      const url = getPublicUrl(doc.file_path);
      const response = await fetch(url);
      
      if (!response.ok) throw new Error("Erreur lors du téléchargement");
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = doc.nom;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Détail du Todo</DialogTitle>
              <div className="flex items-center gap-2">
                {isEnCours && (
                  <Button
                    size="sm"
                    className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleValidateTodo}
                    disabled={updateTodo.isPending}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Valider
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce todo ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Le todo sera définitivement supprimé.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Titre *</Label>
              <Input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={statut} onValueChange={(v) => setStatut(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A_FAIRE">À faire</SelectItem>
                    <SelectItem value="EN_COURS">En cours</SelectItem>
                    <SelectItem value="TERMINE">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={priorite} onValueChange={(v) => setPriorite(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASSE">Basse</SelectItem>
                    <SelectItem value="NORMALE">Normale</SelectItem>
                    <SelectItem value="HAUTE">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_echeance">Échéance</Label>
              <Input
                id="date_echeance"
                type="date"
                value={dateEcheance}
                onChange={(e) => setDateEcheance(e.target.value)}
              />
            </div>

            {/* Afficher sur le planning */}
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="afficher-planning-detail" className="text-sm font-medium cursor-pointer">
                    Afficher sur le planning
                  </Label>
                  {!dateEcheance && (
                    <p className="text-xs text-muted-foreground">Nécessite une date d'échéance</p>
                  )}
                </div>
              </div>
              <Switch
                id="afficher-planning-detail"
                checked={afficherPlanning}
                onCheckedChange={setAfficherPlanning}
                disabled={!dateEcheance}
              />
            </div>

            {/* Documents section */}
            <div className="space-y-3">
              <Label>Documents</Label>
              
              {/* Upload zone */}
              <div
                className="border-2 border-dashed border-border/50 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Cliquez pour ajouter des fichiers
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG (max 10 MB)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleFileSelect}
              />

              {/* Documents grid - card style like Fichiers tab */}
              {docsLoading ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Chargement...
                </div>
              ) : documents.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                  {documents.map((doc) => {
                    const publicUrl = getPublicUrl(doc.file_path);
                    
                    return (
                      <div
                        key={doc.id}
                        className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all"
                      >
                        {/* Preview Area */}
                        <div 
                          className="h-24 bg-muted/30 flex items-center justify-center overflow-hidden relative cursor-pointer"
                          onClick={() => handleOpenDocument(doc)}
                        >
                          {isImageFile(doc.file_type) ? (
                            <img
                              src={publicUrl}
                              alt={doc.nom}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              {getFileIcon(doc.file_type)}
                              <span className="text-xs text-muted-foreground uppercase font-medium">
                                {doc.file_type.split("/")[1]?.toUpperCase() || "FILE"}
                              </span>
                            </div>
                          )}
                          
                          {/* Menu overlay */}
                          <div 
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-6 w-6 shadow-sm">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDocument(doc)}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Ouvrir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Télécharger
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setDocToDelete(doc)} 
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* File Info */}
                        <div className="p-2">
                          <div className="flex items-center gap-1.5">
                            {getSmallFileIcon(doc.file_type)}
                            <p className="text-xs font-medium truncate flex-1" title={doc.nom}>
                              {doc.nom}
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 pl-5">
                            {formatFileDate(doc.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Aucun document attaché
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={!nom.trim() || updateTodo.isPending}>
                {updateTodo.isPending ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </div>
          </div>

          {/* Delete document confirmation */}
          <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce fichier ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Le fichier "{docToDelete?.nom}" sera définitivement supprimé.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteDocument}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Modal */}
      <Dialog open={!!pdfToView} onOpenChange={(open) => !open && setPdfToView(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{pdfToView?.nom}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfToView && <PDFViewer url={getPublicUrl(pdfToView.file_path)} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
