import { Button } from "@/components/ui/button";
import { Minus, Plus, Camera, X } from "lucide-react";
import { useRef } from "react";

interface InventoryItemRowProps {
  designation: string;
  unite: string;
  quantityGood: number;
  quantityRepair: number;
  quantityBroken: number;
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
  quantityRepair,
  quantityBroken,
  photos,
  readOnly,
  onQuantityChange,
  onPhotoAdd,
  onPhotoRemove,
}: InventoryItemRowProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const total = quantityGood + quantityRepair + quantityBroken;
  const showPhotoButton = !readOnly && (quantityRepair > 0 || quantityBroken > 0);

  const Stepper = ({ label, value, field, colorClass }: { 
    label: string; 
    value: number; 
    field: "quantity_good" | "quantity_repair" | "quantity_broken"; 
    colorClass: string; 
  }) => (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-xs font-medium ${colorClass}`}>{label}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onQuantityChange(field, Math.max(0, value - 1))}
          disabled={readOnly || value <= 0}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center font-semibold text-sm">{value}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onQuantityChange(field, value + 1)}
          disabled={readOnly}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="border rounded-lg p-3 bg-card space-y-3">
      {/* Header: designation + total */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <span className="font-medium text-sm">{designation}</span>
          <span className="text-xs text-muted-foreground ml-1">({unite})</span>
        </div>
        <span className="text-sm font-bold">Total: {total}</span>
      </div>

      {/* Steppers */}
      <div className="flex justify-around gap-2">
        <Stepper label="Bon" value={quantityGood} field="quantity_good" colorClass="text-emerald-600 dark:text-emerald-400" />
        <Stepper label="À réparer" value={quantityRepair} field="quantity_repair" colorClass="text-orange-600 dark:text-orange-400" />
        <Stepper label="Cassé" value={quantityBroken} field="quantity_broken" colorClass="text-destructive" />
      </div>

      {/* Photos */}
      {(showPhotoButton || photos.length > 0) && (
        <div className="space-y-2">
          {photos.length > 0 && (
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
          )}
          {showPhotoButton && (
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
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Ajouter une photo
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
