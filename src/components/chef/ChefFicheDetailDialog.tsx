import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FicheDetail } from "@/components/validation/FicheDetail";

interface ChefFicheDetailDialogProps {
  ficheId: string | null;
  onClose: () => void;
}

export const ChefFicheDetailDialog = ({ ficheId, onClose }: ChefFicheDetailDialogProps) => {
  if (!ficheId) return null;

  return (
    <Dialog open={!!ficheId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-[1400px] h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          <FicheDetail 
            ficheId={ficheId} 
            onBack={onClose}
            readOnly={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

