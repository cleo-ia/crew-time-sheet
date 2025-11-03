import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, FileText } from "lucide-react";

interface EditableTextCellProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
}

export const EditableTextCell = ({ value, onSave, placeholder = "Ajouter une note..." }: EditableTextCellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleOpen = () => {
    setEditValue(value);
    setIsOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editValue);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsOpen(false);
      }, 800);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="w-full h-auto min-h-[2rem] py-2 px-2 text-left justify-start hover:bg-muted/50"
        onClick={handleOpen}
      >
        <div className="flex items-start gap-2 w-full">
          <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm break-words whitespace-pre-wrap flex-1 text-foreground">
            {value || <span className="text-muted-foreground italic">{placeholder}</span>}
          </span>
        </div>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier la note</DialogTitle>
            <DialogDescription>
              Saisissez ou modifiez les informations pour cette journée
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              className="min-h-[200px] resize-none"
              disabled={isSaving}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : showSuccess ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Enregistré
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
