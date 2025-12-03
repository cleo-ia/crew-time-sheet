import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Upload, X, FileText, Image as ImageIcon, Download, ExternalLink } from "lucide-react";
import { TodoChantier } from "@/hooks/useTodosChantier";
import { useUpdateTodo } from "@/hooks/useUpdateTodo";
import { useDeleteTodo } from "@/hooks/useDeleteTodo";
import { useTodoDocuments, TodoDocument } from "@/hooks/useTodoDocuments";
import { toast } from "sonner";

interface TodoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: TodoChantier;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

export const TodoDetailDialog = ({ open, onOpenChange, todo }: TodoDetailDialogProps) => {
  const [nom, setNom] = useState(todo.nom);
  const [description, setDescription] = useState(todo.description || "");
  const [statut, setStatut] = useState(todo.statut);
  const [priorite, setPriorite] = useState(todo.priorite || "NORMALE");
  const [dateEcheance, setDateEcheance] = useState(todo.date_echeance || "");
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
  }, [todo]);

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
      await uploadDocument.mutateAsync({ file, todoId: todo.id });
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteDocument = async (doc: TodoDocument) => {
    await deleteDocument.mutateAsync(doc);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>Détail du Todo</DialogTitle>
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

          {/* Documents section */}
          <div className="space-y-2">
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

            {/* Existing documents list */}
            {docsLoading ? (
              <div className="text-sm text-muted-foreground text-center py-2">
                Chargement...
              </div>
            ) : documents.length > 0 ? (
              <div className="space-y-2 mt-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-md group"
                  >
                    {getFileIcon(doc.file_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(getPublicUrl(doc.file_path), "_blank")}
                        title="Ouvrir"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <a
                        href={getPublicUrl(doc.file_path)}
                        download={doc.nom}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent"
                        title="Télécharger"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Supprimer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce fichier ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Le fichier "{doc.nom}" sera définitivement supprimé.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteDocument(doc)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
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
      </DialogContent>
    </Dialog>
  );
};
