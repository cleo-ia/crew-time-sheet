import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type TypeConge = "CP" | "RTT" | "MALADIE" | "AUTRE";

interface DemandeCongeFormProps {
  onSubmit: (data: {
    type_conge: TypeConge;
    date_debut: string;
    date_fin: string;
    motif?: string;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const DemandeCongeForm: React.FC<DemandeCongeFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [typeConge, setTypeConge] = useState<TypeConge>("CP");
  const [dateDebut, setDateDebut] = useState<Date | undefined>();
  const [dateFin, setDateFin] = useState<Date | undefined>();
  const [motif, setMotif] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateDebut || !dateFin) return;

    onSubmit({
      type_conge: typeConge,
      date_debut: format(dateDebut, "yyyy-MM-dd"),
      date_fin: format(dateFin, "yyyy-MM-dd"),
      motif: motif.trim() || undefined,
    });
  };

  const isValid = dateDebut && dateFin && dateFin >= dateDebut;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type de congé */}
      <div className="space-y-2">
        <Label htmlFor="type">Type de congé</Label>
        <Select value={typeConge} onValueChange={(v) => setTypeConge(v as TypeConge)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CP">Congés payés</SelectItem>
            <SelectItem value="RTT">RTT</SelectItem>
            <SelectItem value="MALADIE">Arrêt maladie</SelectItem>
            <SelectItem value="AUTRE">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date de début */}
      <div className="space-y-2">
        <Label>Date de début</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateDebut && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateDebut ? format(dateDebut, "PPP", { locale: fr }) : "Sélectionner une date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateDebut}
              onSelect={setDateDebut}
              locale={fr}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Date de fin */}
      <div className="space-y-2">
        <Label>Date de fin</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateFin && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFin ? format(dateFin, "PPP", { locale: fr }) : "Sélectionner une date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFin}
              onSelect={setDateFin}
              locale={fr}
              disabled={(date) => dateDebut ? date < dateDebut : false}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Motif (optionnel) */}
      <div className="space-y-2">
        <Label htmlFor="motif">Motif (optionnel)</Label>
        <Textarea
          id="motif"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Précisez le motif si nécessaire..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Envoi...
            </>
          ) : (
            "Envoyer la demande"
          )}
        </Button>
      </div>
    </form>
  );
};
