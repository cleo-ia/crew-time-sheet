import { useCallback, useState } from "react";
import { Upload, File, Trash2, Download, Loader2, FolderPlus, Folder, MoreVertical, ArrowLeft, FolderInput, Image, FileText, ExternalLink } from "lucide-react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChantierDocumentsUploadProps {
  chantierId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];

const formatFileDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, "d MMM yyyy", { locale: fr });
};

const isImageFile = (fileType: string) => fileType.startsWith("image/");

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return <Image className="h-8 w-8 text-muted-foreground" />;
  }
  if (fileType === "application/pdf") {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  return <File className="h-8 w-8 text-muted-foreground" />;
};

const getSmallFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return <Image className="h-4 w-4 text-green-600 flex-shrink-0" />;
  }
  if (fileType === "application/pdf") {
    return <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />;
  }
  return <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
};

// File Card Component
const FileCard = ({
  doc,
  onDelete,
  onDownload,
  onOpen,
  onDragStart,
  onDragEnd,
  onMoveToFolder,
  folders,
  isDragging,
}: {
  doc: ChantierDocument;
  onDelete: () => void;
  onDownload: () => void;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent, docId: string) => void;
  onDragEnd: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  folders: ChantierDossier[];
  isDragging: boolean;
}) => {
  const publicUrl = getDocumentUrl(doc.file_path);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, doc.id)}
      onDragEnd={onDragEnd}
      className={`group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Preview Area - Clickable to open */}
      <div 
        className="h-32 bg-muted/30 flex items-center justify-center overflow-hidden relative cursor-pointer"
        onClick={onOpen}
      >
        {isImageFile(doc.file_type) ? (
          <img
            src={publicUrl}
            alt={doc.nom}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            {getFileIcon(doc.file_type)}
            <span className="text-xs text-muted-foreground uppercase font-medium">
              {doc.file_type.split("/")[1]?.toUpperCase() || "FILE"}
            </span>
          </div>
        )}
        
        {/* Menu overlay */}
        <div 
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-7 w-7 shadow-sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpen}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </DropdownMenuItem>
              {folders.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {folders.map((folder) => (
                    <DropdownMenuItem
                      key={folder.id}
                      onClick={() => onMoveToFolder(folder.id)}
                    >
                      <FolderInput className="h-4 w-4 mr-2" />
                      Vers "{folder.nom}"
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {doc.dossier_id && (
                <DropdownMenuItem onClick={() => onMoveToFolder(null)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retirer du dossier
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* File Info */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          {getSmallFileIcon(doc.file_type)}
          <p className="text-sm font-medium truncate flex-1" title={doc.nom}>
            {doc.nom}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1 pl-6">
          Ajouté le {formatFileDate(doc.created_at)}
        </p>
      </div>
    </div>
  );
};

// Folder Card Component
const FolderCard = ({
  folder,
  fileCount,
  onOpen,
  onDelete,
  onDrop,
  isDragOver,
  onDragOver,
  onDragLeave,
}: {
  folder: ChantierDossier;
  fileCount: number;
  onOpen: () => void;
  onDelete: () => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
}) => {
  return (
    <div
      onClick={onOpen}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg cursor-pointer transition-all border-2 ${
        isDragOver ? "border-primary bg-primary/10" : "border-transparent"
      }`}
    >
      <Folder className="h-10 w-10 text-primary flex-shrink-0" fill="currentColor" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{folder.nom}</p>
        <p className="text-xs text-muted-foreground">
          {fileCount} fichier{fileCount !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer le dossier
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export function ChantierDocumentsUpload({ chantierId }: ChantierDocumentsUploadProps) {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
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

  // Get current folder info
  const currentFolder = currentFolderId ? dossiers.find(f => f.id === currentFolderId) : null;

  // Filter folders based on current view (show subfolders of current folder)
  const displayedFolders = currentFolderId
    ? dossiers.filter(folder => folder.parent_id === currentFolderId)
    : dossiers.filter(folder => !folder.parent_id);

  // Filter documents based on current view
  const displayedDocuments = currentFolderId
    ? documents.filter(doc => doc.dossier_id === currentFolderId)
    : documents.filter(doc => !doc.dossier_id);

  // Get file count per folder (including subfolders content)
  const getFileCountForFolder = (folderId: string) => {
    return documents.filter(doc => doc.dossier_id === folderId).length;
  };

  // Get subfolder count per folder
  const getSubfolderCountForFolder = (folderId: string) => {
    return dossiers.filter(folder => folder.parent_id === folderId).length;
  };

  const handleFiles = useCallback(
    async (files: FileList | File[], dossierId: string | null = null) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) continue;
        if (file.size > MAX_FILE_SIZE) continue;
        await uploadMutation.mutateAsync({ chantierId, file, dossierId: dossierId ?? currentFolderId });
      }
    },
    [chantierId, uploadMutation, currentFolderId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
      if (!draggedDocId) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles, draggedDocId]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedDocId) setIsDraggingFile(true);
  }, [draggedDocId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const handleDownload = async (doc: ChantierDocument) => {
    try {
      const url = getDocumentUrl(doc.file_path);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Erreur lors du téléchargement");
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      
      // Nettoyer le blob URL après 60 secondes pour libérer la mémoire
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      console.error("Download error:", error);
    }
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
      if (currentFolderId === dossierToDelete.id) {
        setCurrentFolderId(null);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolderMutation.mutateAsync({ 
      chantierId, 
      nom: newFolderName.trim(),
      parentId: currentFolderId 
    });
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  // Drag & Drop for moving documents
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
    e.stopPropagation();
    if (draggedDocId) {
      e.dataTransfer.dropEffect = "move";
      setDragOverFolderId(folderId);
    }
  };

  const handleFolderDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleFolderDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    if (draggedDocId) {
      const doc = documents.find(d => d.id === draggedDocId);
      if (doc && doc.dossier_id !== targetFolderId) {
        await moveDocMutation.mutateAsync({
          documentId: draggedDocId,
          dossierId: targetFolderId,
          chantierId,
        });
      }
      setDraggedDocId(null);
    }
  };

  const handleMoveToFolder = async (docId: string, folderId: string | null) => {
    await moveDocMutation.mutateAsync({
      documentId: docId,
      dossierId: folderId,
      chantierId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" onDragEnd={handleDocDragEnd}>
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDraggingFile
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-1">
          Glissez vos fichiers ici ou cliquez pour parcourir
        </p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, PDF • Max 10 Mo
        </p>
        {uploadMutation.isPending && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        {currentFolderId ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentFolderId(currentFolder?.parent_id ?? null)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        ) : null}
        
        {currentFolder && (
          <div className="flex items-center gap-2 text-sm">
            <Folder className="h-4 w-4 text-primary" />
            <span className="font-medium">{currentFolder.nom}</span>
          </div>
        )}

        <div className="flex-1" />

        {isCreatingFolder ? (
          <div className="flex items-center gap-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du dossier"
              className="h-9 w-48"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") {
                  setIsCreatingFolder(false);
                  setNewFolderName("");
                }
              }}
              autoFocus
            />
            <Button 
              size="sm" 
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              Créer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName("");
              }}
            >
              Annuler
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreatingFolder(true)}
            className="gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            Nouveau dossier
          </Button>
        )}
      </div>

      {/* Folders Grid */}
      {displayedFolders.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Dossiers</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {displayedFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                fileCount={getFileCountForFolder(folder.id) + getSubfolderCountForFolder(folder.id)}
                onOpen={() => setCurrentFolderId(folder.id)}
                onDelete={() => setDossierToDelete(folder)}
                onDrop={(e) => handleFolderDrop(e, folder.id)}
                isDragOver={dragOverFolderId === folder.id}
                onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                onDragLeave={handleFolderDragLeave}
              />
            ))}
          </div>
        </div>
      )}

      {/* Files Grid */}
      {displayedDocuments.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Fichiers {currentFolder ? `dans "${currentFolder.nom}"` : ""}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {displayedDocuments.map((doc) => (
              <FileCard
                key={doc.id}
                doc={doc}
                onDelete={() => setDocumentToDelete(doc)}
                onDownload={() => handleDownload(doc)}
                onOpen={() => handleDownload(doc)}
                onDragStart={handleDocDragStart}
                onDragEnd={handleDocDragEnd}
                onMoveToFolder={(folderId) => handleMoveToFolder(doc.id, folderId)}
                folders={dossiers.filter(f => f.id !== currentFolderId)}
                isDragging={draggedDocId === doc.id}
              />
            ))}
          </div>
        </div>
      ) : (
        !currentFolderId && dossiers.length === 0 ? null : (
          <div className="text-center py-12 text-muted-foreground">
            <File className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun fichier {currentFolder ? "dans ce dossier" : ""}</p>
          </div>
        )
      )}

      {/* Delete Document Dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce fichier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le fichier "{documentToDelete?.nom}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Folder Dialog */}
      <AlertDialog open={!!dossierToDelete} onOpenChange={() => setDossierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le dossier "{dossierToDelete?.nom}" sera supprimé. Les fichiers qu'il contient seront déplacés à la racine.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolderConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
