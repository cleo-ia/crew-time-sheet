import { useCallback, useState } from "react";
import { Upload, File, Trash2, Download, Loader2, FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown, MoreHorizontal } from "lucide-react";
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function ChantierDocumentsUpload({ chantierId }: ChantierDocumentsUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ChantierDocument | null>(null);
  const [dossierToDelete, setDossierToDelete] = useState<ChantierDossier | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
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

  // Documents sans dossier (à la racine)
  const rootDocuments = documents.filter(doc => !doc.dossier_id);
  
  // Documents groupés par dossier
  const getDocumentsInFolder = (folderId: string) => 
    documents.filter(doc => doc.dossier_id === folderId);

  const handleFiles = useCallback(
    async (files: FileList | File[], dossierId: string | null = null) => {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          continue;
        }
        await uploadMutation.mutateAsync({ chantierId, file, dossierId });
      }
    },
    [chantierId, uploadMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const handleDownload = (doc: ChantierDocument) => {
    const url = getDocumentUrl(doc.file_path);
    window.open(url, "_blank");
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
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolderMutation.mutateAsync({ chantierId, nom: newFolderName.trim() });
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Drag & Drop pour déplacer les documents
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

  const handleFolderDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleFolderDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(null);
    
    if (draggedDocId) {
      const doc = documents.find(d => d.id === draggedDocId);
      if (doc && doc.dossier_id !== folderId) {
        await moveDocMutation.mutateAsync({ 
          documentId: draggedDocId, 
          dossierId: folderId,
          chantierId 
        });
      }
      setDraggedDocId(null);
    }
  };

  const isImage = (fileType: string) => fileType.startsWith("image/");

  const DocumentItem = ({ doc, inFolder = false }: { doc: ChantierDocument; inFolder?: boolean }) => (
    <div
      key={doc.id}
      draggable
      onDragStart={(e) => handleDocDragStart(e, doc.id)}
      onDragEnd={handleDocDragEnd}
      className={`flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-grab active:cursor-grabbing ${
        draggedDocId === doc.id ? "opacity-50" : ""
      } ${inFolder ? "ml-6" : ""}`}
    >
      {/* Thumbnail or icon */}
      {isImage(doc.file_type) ? (
        <div className="w-10 h-10 rounded overflow-hidden bg-background flex-shrink-0">
          <img
            src={getDocumentUrl(doc.file_path)}
            alt={doc.nom}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded bg-background flex items-center justify-center flex-shrink-0">
          <File className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.nom}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(doc.file_size)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleDownload(doc)}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => setDocumentToDelete(doc)}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const FolderItem = ({ folder }: { folder: ChantierDossier }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderDocs = getDocumentsInFolder(folder.id);
    const isDragOver = dragOverFolderId === folder.id;

    return (
      <div className="space-y-1">
        <div
          onDragOver={(e) => handleFolderDragOver(e, folder.id)}
          onDragLeave={handleFolderDragLeave}
          onDrop={(e) => handleFolderDrop(e, folder.id)}
          className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
            isDragOver 
              ? "bg-primary/10 border-2 border-dashed border-primary" 
              : "bg-muted/30 hover:bg-muted/50"
          }`}
          onClick={() => toggleFolder(folder.id)}
        >
          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          {isExpanded ? (
            <FolderOpen className="h-5 w-5 text-primary" />
          ) : (
            <Folder className="h-5 w-5 text-primary" />
          )}
          <span className="flex-1 font-medium text-sm">{folder.nom}</span>
          <span className="text-xs text-muted-foreground">
            {folderDocs.length} fichier{folderDocs.length !== 1 ? "s" : ""}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setDossierToDelete(folder);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && (
          <div className="space-y-2 pl-4 border-l-2 border-muted ml-4">
            {folderDocs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 pl-2">
                Glissez des fichiers ici
              </p>
            ) : (
              folderDocs.map((doc) => (
                <DocumentItem key={doc.id} doc={doc} inFolder />
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
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
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Cliquez ou glissez-déposez vos fichiers</p>
        <p className="text-xs text-muted-foreground mt-1">
          Images JPG/PNG, PDF - Max 10 Mo par fichier
        </p>
        {uploadMutation.isPending && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Create folder button / form */}
      {isCreatingFolder ? (
        <div className="flex items-center gap-2">
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

      {/* Documents and folders list */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (dossiers.length > 0 || documents.length > 0) ? (
        <div className="space-y-3">
          {/* Dossiers */}
          {dossiers.map((folder) => (
            <FolderItem key={folder.id} folder={folder} />
          ))}

          {/* Root documents (drop zone) */}
          {rootDocuments.length > 0 && (
            <div
              onDragOver={(e) => handleFolderDragOver(e, null)}
              onDragLeave={handleFolderDragLeave}
              onDrop={(e) => handleFolderDrop(e, null)}
              className={`space-y-2 ${
                dragOverFolderId === null && draggedDocId 
                  ? "p-2 rounded-lg border-2 border-dashed border-primary bg-primary/5" 
                  : ""
              }`}
            >
              <p className="text-sm font-medium text-muted-foreground">
                Documents ({rootDocuments.length})
              </p>
              {rootDocuments.map((doc) => (
                <DocumentItem key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Delete document confirmation dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le document "{documentToDelete?.nom}" sera définitivement supprimé.
              Cette action est irréversible.
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

      {/* Delete folder confirmation dialog */}
      <AlertDialog open={!!dossierToDelete} onOpenChange={() => setDossierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le dossier ?</AlertDialogTitle>
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
