import { Button } from "@/components/ui/button";
import { Minus, Plus, Camera, X } from "lucide-react";
import { useRef } from "react";

interface InventoryItemRowProps {
  designation: string;
  unite: string;
  quantityGood: number;
  quantityRepair?: number;
  quantityBroken?: number;
  photos: string[];
  readOnly: boolean;
  onQuantityChange: (field: "quantity_good" | "quantity_repair" | "quantity_broken", value: number) => void;
  onPhotoAdd: (file: File) => void;
  onPhotoRemove: (url: string) => void;
}

export const InventoryItemRow = ({
  designation,
  unite,
  quantityGood,
  photos,
  readOnly,
  onQuantityChange,
  onPhotoAdd,
  onPhotoRemove,
}: InventoryItemRowProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{designation}</span>
          <span className="text-xs text-muted-foreground ml-1">({unite})</span>
        </div>
        <div className="flex items-center gap-1">
          {!readOnly && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPhotoAdd(file);
                  e.target.value = "";
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onQuantityChange("quantity_good", Math.max(0, quantityGood - 1))}
            disabled={readOnly || quantityGood <= 0}
          >
            <Minus className="h-3 w-3" />
          </Button>
           <input
            type="number"
            min={0}
            value={quantityGood}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onQuantityChange("quantity_good", isNaN(val) ? 0 : Math.max(0, val));
            }}
            disabled={readOnly}
            className="w-12 text-center font-semibold text-sm border rounded h-8 bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onQuantityChange("quantity_good", quantityGood + 1)}
            disabled={readOnly}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
            {photos.map((url, idx) => (
              <div key={idx} className="relative group">
                <img src={url} alt="" className="h-16 w-16 object-cover rounded-md border" />
                {!readOnly && (
                  <button
                    onClick={() => onPhotoRemove(url)}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
