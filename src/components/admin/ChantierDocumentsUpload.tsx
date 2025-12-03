import { useCallback, useState } from "react";
import { Upload, File, Trash2, Download, Loader2, FolderPlus, Folder, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useChantierDocuments,
  useChantierDossiers,
  useUploadChantierDocument,
  useDeleteChantierDocument,
  useCreateChantierDossier,
  useDeleteChantierDossier,
  useMoveDocumentToFolder,
  getDocumentUrl,
  type ChantierDocument,
  type ChantierDossier,
} from "@/hooks/useChantierDocuments";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChantierDocumentsUploadProps {
  chantierId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];

export function ChantierDocumentsUpload({ chantierId }: ChantierDocumentsUploadProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<ChantierDocument | null>(null);
  const [dossierToDelete, setDossierToDelete] = useState<ChantierDossier | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);

  const { data: documents = [], isLoading: isLoadingDocs } = useChantierDocuments(chantierId);
  const { data: dossiers = [], isLoading: isLoadingDossiers } = useChantierDossiers(chantierId);
  const uploadMutation = useUploadChantierDocument();
  const deleteMutation = useDeleteChantierDocument();
  const createFolderMutation = useCreateChantierDossier();
  const deleteFolderMutation = useDeleteChantierDossier();
  const moveDocMutation = useMoveDocumentToFolder();

  const isLoading = isLoadingDocs || isLoadingDossiers;
  const currentFolder = currentFolderId ? dossiers.find(d => d.id === currentFolderId) : null;
  const currentDocuments = currentFolderId
    ? documents.filter(doc => doc.dossier_id === currentFolderId)
    : documents.filter(doc => !doc.dossier_id);
  const totalDocuments = documents.length;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) continue;
        if (file.size > MAX_FILE_SIZE) continue;
        await uploadMutation.mutateAsync({ chantierId, file, dossierId: currentFolderId });
      }
    },
    [chantierId, uploadMutation, currentFolderId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (draggedDocId && dragOverFolderId !== undefined) {
        const doc = documents.find(d => d.id === draggedDocId);
        if (doc && doc.dossier_id !== dragOverFolderId) {
          moveDocMutation.mutate({ documentId: draggedDocId, dossierId: dragOverFolderId, chantierId });
        }
        setDraggedDocId(null);
        setDragOverFolderId(null);
        return;
      }
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles, draggedDocId, dragOverFolderId, documents, moveDocMutation, chantierId]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedDocId) setIsDragging(true);
  }, [draggedDocId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleFiles(e.target.files);
    },
    [handleFiles]
  );

  const handleDownload = (doc: ChantierDocument) => {
    window.open(getDocumentUrl(doc.file_path), "_blank");
  };

  const handleDeleteConfirm = () => {
    if (documentToDelete) {
      deleteMutation.mutate({ document: documentToDelete });
      setDocumentToDelete(null);
    }
  };

  const handleDeleteFolderConfirm = () => {
    if (dossierToDelete) {
      deleteFolderMutation.mutate({ dossier: dossierToDelete });
      setDossierToDelete(null);
      if (currentFolderId === dossierToDelete.id) setCurrentFolderId(null);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolderMutation.mutateAsync({ chantierId, nom: newFolderName.trim() });
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  const handleDocDragStart = (e: React.DragEvent, docId: string) => {
    setDraggedDocId(docId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDocDragEnd = () => {
    setDraggedDocId(null);
    setDragOverFolderId(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    if (draggedDocId) {
      e.dataTransfer.dropEffect = "move";
      setDragOverFolderId(folderId);
    }
  };

  const handleFolderDragLeave = () => setDragOverFolderId(null);

  const handleFolderDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    if (draggedDocId) {
      const doc = documents.find(d => d.id === draggedDocId);
      if (doc && doc.dossier_id !== folderId) {
        await moveDocMutation.mutateAsync({ documentId: draggedDocId, dossierId: folderId, chantierId });
      }
      setDraggedDocId(null);
    }
  };

  const Breadcrumb = () => (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => setCurrentFolderId(null)}
        className={`hover:underline ${!currentFolderId ? "text-foreground font-medium" : "text-muted-foreground"}`}
      >
        Tous les fichiers
      </button>
      {currentFolder && (
        <>
          <span className="text-muted-foreground">&gt;</span>
          <span className="text-foreground font-medium">{currentFolder.nom}</span>
        </>
      )}
    </div>
  );

  const FolderCard = ({ folder }: { folder: ChantierDossier }) => {
    const isDragOver = dragOverFolderId === folder.id;
    return (
      <div
        onClick={() => setCurrentFolderId(folder.id)}
        onDragOver={(e) => handleFolderDragOver(e, folder.id)}
        onDragLeave={handleFolderDragLeave}
        onDrop={(e) => handleFolderDrop(e, folder.id)}
        className={`flex items-center gap-3 p-4 bg-background border rounded-lg cursor-pointer hover:border-primary/50 transition-colors ${
          isDragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <Folder className="h-5 w-5 text-muted-foreground" />
        <span className="flex-1 font-medium text-sm truncate">{folder.nom}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); setDossierToDelete(folder); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const DocumentCard = ({ doc }: { doc: ChantierDocument }) => {
    const isPdf = doc.file_type === "application/pdf";
    return (
      <div
        draggable
        onDragStart={(e) => handleDocDragStart(e, doc.id)}
        onDragEnd={handleDocDragEnd}
        className={`flex items-center gap-3 p-4 bg-background border border-border rounded-lg cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors ${
          draggedDocId === doc.id ? "opacity-50" : ""
        }`}
      >
        <div className="flex-shrink-0">
          {isPdf ? (
            <File className="h-6 w-6 text-muted-foreground" />
          ) : (
            <div className="w-8 h-10 rounded overflow-hidden bg-muted">
              <img src={getDocumentUrl(doc.file_path)} alt={doc.nom} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <span className="flex-1 text-sm font-medium truncate" title={doc.nom}>{doc.nom}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDownload(doc)}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDocumentToDelete(doc)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsCreatingFolder(true)} className="gap-2">
            <FolderPlus className="h-4 w-4" />
            Nouveau dossier
          </Button>
          <label>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple onChange={handleFileSelect} className="hidden" />
            <Button asChild size="sm" className="gap-2 cursor-pointer">
              <span><Plus className="h-4 w-4" />Ajouter un fichier</span>
            </Button>
          </label>
        </div>
      </div>

      {isCreatingFolder && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nom du dossier"
            className="flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") setIsCreatingFolder(false);
            }}
          />
          <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolderMutation.isPending}>Créer</Button>
          <Button size="sm" variant="ghost" onClick={() => { setIsCreatingFolder(false); setNewFolderName(""); }}>Annuler</Button>
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`min-h-[200px] p-4 rounded-lg border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
        }`}
      >
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-6">
            {!currentFolderId && dossiers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {dossiers.map((folder) => <FolderCard key={folder.id} folder={folder} />)}
              </div>
            )}

            {currentDocuments.length > 0 && (
              <div
                onDragOver={(e) => { if (draggedDocId) handleFolderDragOver(e, currentFolderId); }}
                onDragLeave={handleFolderDragLeave}
                onDrop={(e) => handleFolderDrop(e, currentFolderId)}
              >
                {!currentFolderId && <p className="text-sm font-medium text-muted-foreground mb-3">Documents ({totalDocuments})</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {currentDocuments.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
                </div>
              </div>
            )}

            {!currentFolderId && dossiers.length === 0 && documents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Glissez-déposez vos fichiers ici</p>
              </div>
            )}

            {currentFolderId && currentDocuments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Ce dossier est vide</p>
              </div>
            )}
          </div>
        )}
        {uploadMutation.isPending && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le document ?</AlertDialogTitle>
            <AlertDialogDescription>Le document "{documentToDelete?.nom}" sera définitivement supprimé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!dossierToDelete} onOpenChange={() => setDossierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le dossier ?</AlertDialogTitle>
            <AlertDialogDescription>Le dossier "{dossierToDelete?.nom}" sera supprimé. Les fichiers qu'il contient seront déplacés à la racine.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolderConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
