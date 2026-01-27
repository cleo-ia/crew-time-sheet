import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { LigneMateriau } from "@/hooks/useFichesTransportMateriaux";

interface TransportMateriauxLigneRowProps {
  ligne: LigneMateriau;
  index: number;
  onChange: (index: number, field: keyof LigneMateriau, value: string | number) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

const CATEGORIES = ["Matériel", "PAM", "Coffrage", "Ferraillage", "Outillage", "Divers"];
const UNITES = ["U", "m", "m²", "m³", "kg", "T", "lot", "ens."];

export const TransportMateriauxLigneRow = ({
  ligne,
  index,
  onChange,
  onRemove,
  disabled = false,
}: TransportMateriauxLigneRowProps) => {
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-border/50 last:border-b-0">
      {/* Catégorie */}
      <div className="col-span-2">
        <Select
          value={ligne.categorie}
          onValueChange={(value) => onChange(index, "categorie", value)}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Désignation */}
      <div className="col-span-5">
        <Input
          value={ligne.designation}
          onChange={(e) => onChange(index, "designation", e.target.value)}
          placeholder="Description du matériel..."
          className="h-9 text-sm"
          disabled={disabled}
        />
      </div>

      {/* Unité */}
      <div className="col-span-2">
        <Select
          value={ligne.unite}
          onValueChange={(value) => onChange(index, "unite", value)}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITES.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quantité */}
      <div className="col-span-2">
        <Input
          type="number"
          min={0}
          step={0.5}
          value={ligne.quantite}
          onChange={(e) => onChange(index, "quantite", parseFloat(e.target.value) || 0)}
          className="h-9 text-sm text-center"
          disabled={disabled}
        />
      </div>

      {/* Supprimer */}
      <div className="col-span-1 flex justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(index)}
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
