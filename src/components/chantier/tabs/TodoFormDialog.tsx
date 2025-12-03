import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTodo } from "@/hooks/useCreateTodo";
import { uploadTodoDocuments } from "@/hooks/useTodoDocuments";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface TodoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chantierId: string;
}

interface PendingFile {
  id: string;
  file: File;
  previewUrl?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

const isImageFile = (type: string) => type.startsWith("image/");

const getFileIcon = (type: string) => {
  if (type === "application/pdf") {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  if (isImageFile(type)) {
    return <ImageIcon className="h-8 w-8 text-blue-500" />;
  }
  return <FileText className="h-8 w-8 text-muted-foreground" />;
};

const getSmallFileIcon = (type: string) => {
  if (type === "application/pdf") {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  if (isImageFile(type)) {
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export const TodoFormDialog = ({ open, onOpenChange, chantierId }: TodoFormDialogProps) => {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [priorite, setPriorite] = useState<"BASSE" | "NORMALE" | "HAUTE">("NORMALE");
  const [dateEcheance, setDateEcheance] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createTodo = useCreateTodo();

  // Cleanup preview URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      pendingFiles.forEach((pf) => {
        if (pf.previewUrl) {
          URL.revokeObjectURL(pf.previewUrl);
        }
      });
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} dépasse la taille maximale de 10 MB`);
        return false;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: type de fichier non supporté`);
        return false;
      }
      return true;
    });

    const newPendingFiles: PendingFile[] = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: isImageFile(file.type) ? URL.createObjectURL(file) : undefined,
    }));

    setPendingFiles((prev) => [...prev, ...newPendingFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => {
      const fileToRemove = prev.find((pf) => pf.id === id);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter((pf) => pf.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    setIsUploading(true);
    try {
      // Create the todo first
      const newTodo = await createTodo.mutateAsync({
        chantier_id: chantierId,
        nom: nom.trim(),
        description: description.trim() || undefined,
        priorite,
        date_echeance: dateEcheance || undefined,
      });

      // Upload files if any
      if (pendingFiles.length > 0 && newTodo?.id) {
        await uploadTodoDocuments(newTodo.id, pendingFiles.map((pf) => pf.file));
        toast.success(`${pendingFiles.length} fichier(s) ajouté(s)`);
      }

      // Clean up preview URLs
      pendingFiles.forEach((pf) => {
        if (pf.previewUrl) {
          URL.revokeObjectURL(pf.previewUrl);
        }
      });

      // Reset form
      setNom("");
      setDescription("");
      setPriorite("NORMALE");
      setDateEcheance("");
      setPendingFiles([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating todo:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Clean up preview URLs
      pendingFiles.forEach((pf) => {
        if (pf.previewUrl) {
          URL.revokeObjectURL(pf.previewUrl);
        }
      });
      setNom("");
      setDescription("");
      setPriorite("NORMALE");
      setDateEcheance("");
      setPendingFiles([]);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouveau Todo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Titre *</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Commander matériaux"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails supplémentaires..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="date_echeance">Échéance</Label>
              <Input
                id="date_echeance"
                type="date"
                value={dateEcheance}
                onChange={(e) => setDateEcheance(e.target.value)}
              />
            </div>
          </div>

          {/* Documents section */}
          <div className="space-y-2">
            <Label>Documents</Label>
            <div
              className="border-2 border-dashed border-border/50 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
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

            {/* Pending files - card grid style */}
            {pendingFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {pendingFiles.map((pf) => (
                  <div
                    key={pf.id}
                    className="group relative bg-card border border-border rounded-lg overflow-hidden"
                  >
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => removeFile(pf.id)}
                      className="absolute top-1 right-1 z-10 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    {/* Preview Area */}
                    <div className="h-24 bg-muted/30 flex items-center justify-center overflow-hidden">
                      {pf.previewUrl ? (
                        <img
                          src={pf.previewUrl}
                          alt={pf.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          {getFileIcon(pf.file.type)}
                          <span className="text-xs text-muted-foreground uppercase font-medium">
                            {pf.file.type === "application/pdf" ? "PDF" : pf.file.type.split("/")[1]?.toUpperCase() || "FILE"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="p-2">
                      <div className="flex items-center gap-1.5">
                        {getSmallFileIcon(pf.file.type)}
                        <p className="text-xs font-medium truncate flex-1" title={pf.file.name}>
                          {pf.file.name}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 pl-5">
                        {formatFileSize(pf.file.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!nom.trim() || createTodo.isPending || isUploading}>
              {isUploading ? "Upload..." : createTodo.isPending ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
