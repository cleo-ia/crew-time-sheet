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

interface CounterProps {
  label: string;
  color: string;
  value: number;
  field: "quantity_good" | "quantity_repair" | "quantity_broken";
  readOnly: boolean;
  onQuantityChange: (field: "quantity_good" | "quantity_repair" | "quantity_broken", value: number) => void;
}

const Counter = ({ label, color, value, field, readOnly, onQuantityChange }: CounterProps) => (
  <div className="flex flex-col items-center gap-1">
    <span className={`text-xs font-semibold flex items-center gap-1`}>
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
      {label}
    </span>
    <div className="flex items-center gap-0.5">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => onQuantityChange(field, Math.max(0, value - 1))}
        disabled={readOnly || value <= 0}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <input
        type="number"
        min={0}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          onQuantityChange(field, isNaN(val) ? 0 : Math.max(0, val));
        }}
        disabled={readOnly}
        className="w-10 text-center font-semibold text-sm border rounded h-7 bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => onQuantityChange(field, value + 1)}
        disabled={readOnly}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  </div>
);

export const InventoryItemRow = ({
  designation,
  unite,
  quantityGood,
  quantityRepair = 0,
  quantityBroken = 0,
  photos,
  readOnly,
  onQuantityChange,
  onPhotoAdd,
  onPhotoRemove,
}: InventoryItemRowProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{designation}</span>
          <span className="text-xs text-muted-foreground ml-1">({unite})</span>
        </div>
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
      </div>

      <div className="flex items-start justify-around gap-2">
        <Counter label="Bon état" color="bg-emerald-500" value={quantityGood} field="quantity_good" readOnly={readOnly} onQuantityChange={onQuantityChange} />
        <Counter label="À nettoyer" color="bg-orange-500" value={quantityBroken} field="quantity_broken" readOnly={readOnly} onQuantityChange={onQuantityChange} />
        <Counter label="À réparer" color="bg-red-500" value={quantityRepair} field="quantity_repair" readOnly={readOnly} onQuantityChange={onQuantityChange} />
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
