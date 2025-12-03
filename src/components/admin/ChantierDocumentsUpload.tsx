import { useCallback, useState } from "react";
import { Upload, File, Trash2, Download, Loader2, FolderPlus, Folder, MoreHorizontal, FileText, Image as ImageIcon } from "lucide-react";
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
  const [isDragging, setIsDragging] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ChantierDocument | null>(null);
  const [dossierToDelete, setDossierToDelete] = useState<ChantierDossier | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
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
  const visibleDocuments = currentFolderId
    ? documents.filter(doc => doc.dossier_id === currentFolderId)
    : documents.filter(doc => !doc.dossier_id);

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
      if (e.dataTransfer.files.length > 0 && !draggedDocId) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles, draggedDocId]
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

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (draggedDocId) {
      e.dataTransfer.dropEffect = "move";
      setDragOverFolderId(folderId);
    }
  };

  const handleFolderDragLeave = () => setDragOverFolderId(null);

  const handleFolderDrop = async (e: React.DragEvent, folderId: string) => {
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

  const isImage = (fileType: string) => fileType.startsWith("image/");

  const FolderCard = ({ folder }: { folder: ChantierDossier }) => {
    const folderDocsCount = documents.filter(d => d.dossier_id === folder.id).length;
    const isDragOver = dragOverFolderId === folder.id;

    return (
      <div
        onClick={() => setCurrentFolderId(folder.id)}
        onDragOver={(e) => handleFolderDragOver(e, folder.id)}
        onDragLeave={handleFolderDragLeave}
        onDrop={(e) => handleFolderDrop(e, folder.id)}
        className={`group relative flex items-center gap-3 p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
          isDragOver 
            ? "border-primary bg-primary/10 ring-2 ring-primary/30" 
            : "border-border bg-card hover:bg-accent/50 hover:border-accent"
        }`}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Folder className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{folder.nom}</p>
          <p className="text-xs text-muted-foreground">{folderDocsCount} fichier{folderDocsCount !== 1 ? "s" : ""}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
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

  const DocumentCard = ({ doc }: { doc: ChantierDocument }) => (
    <div
      draggable
      onDragStart={(e) => handleDocDragStart(e, doc.id)}
      onDragEnd={handleDocDragEnd}
      className={`group relative rounded-xl border border-border bg-card overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-lg hover:border-accent ${
        draggedDocId === doc.id ? "opacity-50 scale-95" : ""
      }`}
    >
      <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center overflow-hidden">
        {isImage(doc.file_type) ? (
          <img src={getDocumentUrl(doc.file_path)} alt={doc.nom} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            {doc.file_type === "application/pdf" ? (
              <FileText className="h-12 w-12 text-red-500" />
            ) : (
              <File className="h-12 w-12" />
            )}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            {isImage(doc.file_type) ? (
              <ImageIcon className="h-4 w-4 text-green-600" />
            ) : (
              <FileText className="h-4 w-4 text-red-500" />
            )}
          </div>
          <p className="flex-1 text-sm font-medium truncate" title={doc.nom}>{doc.nom}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mt-0.5 -mr-1">
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
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Cliquez ou glissez-déposez vos fichiers</p>
        <p className="text-xs text-muted-foreground mt-1">Images JPG/PNG, PDF - Max 10 Mo par fichier</p>
        {uploadMutation.isPending && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      {currentFolderId && (
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setCurrentFolderId(null)} className="text-primary hover:underline">Fichiers</button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{currentFolder?.nom}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {!currentFolderId && (
          isCreatingFolder ? (
            <div className="flex items-center gap-2">
              <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Nom du dossier" className="h-9 w-48" autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setIsCreatingFolder(false); }} />
              <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolderMutation.isPending}>Créer</Button>
              <Button size="sm" variant="ghost" onClick={() => { setIsCreatingFolder(false); setNewFolderName(""); }}>Annuler</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsCreatingFolder(true)} className="gap-2">
              <FolderPlus className="h-4 w-4" />
              Nouveau dossier
            </Button>
          )
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {!currentFolderId && dossiers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Dossiers</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {dossiers.map((folder) => <FolderCard key={folder.id} folder={folder} />)}
              </div>
            </div>
          )}

          {visibleDocuments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Fichiers ({visibleDocuments.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {visibleDocuments.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
              </div>
            </div>
          )}

          {!currentFolderId && dossiers.length === 0 && visibleDocuments.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun fichier</p>
              <p className="text-sm">Glissez-déposez des fichiers ou créez un dossier</p>
            </div>
          )}

          {currentFolderId && visibleDocuments.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Ce dossier est vide</p>
              <p className="text-sm">Glissez des fichiers ici pour les ajouter</p>
            </div>
          )}
        </div>
      )}

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
            <AlertDialogDescription>Le dossier "{dossierToDelete?.nom}" sera supprimé. Les fichiers seront déplacés à la racine.</AlertDialogDescription>
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
