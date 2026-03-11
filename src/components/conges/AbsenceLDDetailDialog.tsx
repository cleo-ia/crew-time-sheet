import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check } from "lucide-react";
import { useEnterpriseConfig } from "@/hooks/useEnterpriseConfig";

interface AbsenceLDDetailDialogProps {
  absence: {
    id: string;
    type_absence: string;
    date_debut: string;
    date_fin: string | null;
    motif: string | null;
    salarie_nom: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_ABSENCE_OPTIONS = [
  { value: "AT", label: "Accident du travail" },
  { value: "AM", label: "Arrêt maladie" },
  { value: "MP", label: "Maladie professionnelle" },
  { value: "CONGE_PARENTAL", label: "Congé parental" },
  { value: "CONTRAT_ARRETE", label: "Contrat arrêté" },
  { value: "CONTRAT_NON_DEBUTE", label: "Contrat non débuté" },
];

const ReadOnlyCheckbox: React.FC<{ checked: boolean; label: string }> = ({ checked, label }) => (
  <div className="flex items-center gap-2">
    <div className={`w-4 h-4 border-2 border-foreground flex items-center justify-center ${checked ? 'bg-green-600 border-green-600' : ''}`}>
      {checked && <Check className="h-3 w-3 text-white" />}
    </div>
    <span className="text-sm">{label}</span>
  </div>
);

export const AbsenceLDDetailDialog: React.FC<AbsenceLDDetailDialogProps> = ({
  absence,
  open,
  onOpenChange,
}) => {
  const config = useEnterpriseConfig();

  if (!absence) return null;

  // Split "NOM Prénom" into parts
  const parts = absence.salarie_nom.trim().split(/\s+/);
  const nom = parts[0]?.toUpperCase() || "";
  const prenom = parts.slice(1).join(" ") || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden">
        <div className="bg-[#fafaf8] p-6">
          {/* En-tête avec logo */}
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
              {config.theme?.logo && (
                <img
                  src={config.theme.logo}
                  alt={config.nom || "Logo"}
                  className="h-14 w-auto object-contain"
                />
              )}
              <div className="flex-1">
                <DialogTitle className="text-lg font-bold uppercase text-center">
                  Absence Longue Durée
                </DialogTitle>
                {config.nom && (
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    {config.nom}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Formulaire style papier */}
          <div className="space-y-4 border-2 border-foreground/30 p-4 bg-background shadow-sm">

            {/* Section Salarié */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="font-semibold text-sm w-16">NOM :</span>
                <span className="text-sm border-b border-foreground/50 flex-1 pb-0.5">
                  {nom}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-sm w-16">Prénom :</span>
                <span className="text-sm border-b border-foreground/50 flex-1 pb-0.5">
                  {prenom}
                </span>
              </div>
            </div>

            {/* Type d'absence - grille de cases */}
            <div className="pt-2">
              <p className="font-semibold text-sm mb-3 underline">Type d'absence :</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {TYPE_ABSENCE_OPTIONS.map((type) => (
                  <ReadOnlyCheckbox
                    key={type.value}
                    checked={absence.type_absence === type.value}
                    label={type.label}
                  />
                ))}
              </div>
            </div>

            {/* Section Dates */}
            <div className="pt-3 flex items-center gap-4">
              <div className="flex gap-2 items-center">
                <span className="font-semibold text-sm">Du :</span>
                <span className="text-sm border-b border-foreground/50 px-2 pb-0.5 min-w-24 text-center">
                  {format(new Date(absence.date_debut), "dd/MM/yyyy", { locale: fr })}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="font-semibold text-sm">Au :</span>
                <span className="text-sm border-b border-foreground/50 px-2 pb-0.5 min-w-24 text-center">
                  {absence.date_fin
                    ? format(new Date(absence.date_fin), "dd/MM/yyyy", { locale: fr })
                    : "Indéterminée"}
                </span>
              </div>
            </div>

            {/* Section Motif */}
            {absence.motif && (
              <div className="pt-2">
                <p className="font-semibold text-sm">Motif :</p>
                <p className="text-sm mt-1 border border-foreground/30 p-2 bg-muted/30 min-h-12">
                  {absence.motif}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
