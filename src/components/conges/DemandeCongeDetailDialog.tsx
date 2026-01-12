import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { DemandeConge } from "@/hooks/useDemandesConges";
import { useEnterpriseConfig } from "@/hooks/useEnterpriseConfig";

interface DemandeCongeDetailDialogProps {
  demande: DemandeConge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statutConfig = {
  EN_ATTENTE: { label: "En attente", variant: "secondary" as const, icon: Clock },
  VALIDEE_CONDUCTEUR: { label: "Validée conducteur", variant: "outline" as const, icon: CheckCircle2 },
  VALIDEE_RH: { label: "Validée", variant: "default" as const, icon: CheckCircle2 },
  REFUSEE: { label: "Refusée", variant: "destructive" as const, icon: XCircle },
};

const typeCongeOptions = [
  { value: "CP", label: "C.P." },
  { value: "RTT", label: "R.T.T." },
  { value: "DECES", label: "Décès" },
  { value: "NAISSANCE", label: "Naissance" },
  { value: "MARIAGE", label: "Mariage" },
  { value: "SANS_SOLDE", label: "Sans solde" },
  { value: "ABSENCE_AUTORISEE", label: "Absence autorisée" },
  { value: "ABSENCE_RECUPEREE", label: "Absence récupérée" },
  { value: "MALADIE", label: "Maladie" },
  { value: "AUTRE", label: "Autre" },
];

// Checkbox visuel en lecture seule
const ReadOnlyCheckbox: React.FC<{ checked: boolean; label: string }> = ({ checked, label }) => (
  <div className="flex items-center gap-2">
    <div className={`w-4 h-4 border-2 border-foreground flex items-center justify-center ${checked ? 'bg-green-600 border-green-600' : ''}`}>
      {checked && <Check className="h-3 w-3 text-white" />}
    </div>
    <span className="text-sm">{label}</span>
  </div>
);

export const DemandeCongeDetailDialog: React.FC<DemandeCongeDetailDialogProps> = ({
  demande,
  open,
  onOpenChange,
}) => {
  const config = useEnterpriseConfig();

  if (!demande) return null;

  const statut = statutConfig[demande.statut];
  const StatusIcon = statut.icon;
  const demandeurName = demande.demandeur 
    ? `${demande.demandeur.nom || ""}`.toUpperCase()
    : "";
  const demandeurPrenom = demande.demandeur?.prenom || "";

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
                  Demande autorisation d'Absence ou Congé
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
          <div className="space-y-4 border-2 border-foreground/30 p-4 bg-white shadow-sm">
            
            {/* Section Salarié */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="font-semibold text-sm w-16">NOM :</span>
                  <span className="text-sm border-b border-foreground/50 flex-1 pb-0.5">
                    {demandeurName}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-sm w-16">Prénom :</span>
                  <span className="text-sm border-b border-foreground/50 flex-1 pb-0.5">
                    {demandeurPrenom}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="font-semibold text-sm">Date :</span>
                  <span className="text-sm border-b border-foreground/50 flex-1 pb-0.5">
                    {format(new Date(demande.created_at), "dd/MM/yyyy", { locale: fr })}
                  </span>
                </div>
              </div>
            </div>

            {/* Type d'absence - grille de cases */}
            <div className="pt-2">
              <p className="font-semibold text-sm mb-3 underline">Type d'absence :</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {typeCongeOptions.slice(0, 6).map((type) => (
                  <ReadOnlyCheckbox 
                    key={type.value} 
                    checked={demande.type_conge === type.value} 
                    label={type.label} 
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                {typeCongeOptions.slice(6).map((type) => (
                  <ReadOnlyCheckbox 
                    key={type.value} 
                    checked={demande.type_conge === type.value} 
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
                  {format(new Date(demande.date_debut), "dd/MM/yyyy", { locale: fr })}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="font-semibold text-sm">Au :</span>
                <span className="text-sm border-b border-foreground/50 px-2 pb-0.5 min-w-24 text-center">
                  {format(new Date(demande.date_fin), "dd/MM/yyyy", { locale: fr })}
                </span>
              </div>
            </div>

            {/* Section Motif */}
            {demande.motif && (
              <div className="pt-2">
                <p className="font-semibold text-sm">Motif :</p>
                <p className="text-sm mt-1 border border-foreground/30 p-2 bg-muted/30 min-h-12">
                  {demande.motif}
                </p>
              </div>
            )}

            {/* Section Signature */}
            <div className="pt-3 flex justify-between items-end">
              <div>
                <p className="font-semibold text-sm mb-1">Signature du salarié :</p>
                {demande.signature_data ? (
                  <div className="border border-foreground/30 bg-white w-40 h-20 flex items-center justify-center">
                    <img 
                      src={demande.signature_data} 
                      alt="Signature" 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="border border-foreground/30 bg-muted/20 w-40 h-20 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground italic">Non signée</span>
                  </div>
                )}
              </div>

              {/* Statut */}
              <div className="text-right">
                <Badge variant={statut.variant} className="text-sm px-3 py-1">
                  <StatusIcon className="h-4 w-4 mr-1.5" />
                  {statut.label}
                </Badge>
                
                {/* Date de validation/refus */}
                {demande.statut === "VALIDEE_CONDUCTEUR" && demande.validee_par_conducteur_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Le {format(new Date(demande.validee_par_conducteur_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                  </p>
                )}
                {demande.statut === "VALIDEE_RH" && demande.validee_par_rh_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Le {format(new Date(demande.validee_par_rh_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                  </p>
                )}
                {demande.statut === "REFUSEE" && demande.refusee_par_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Le {format(new Date(demande.refusee_par_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                  </p>
                )}
              </div>
            </div>

            {/* Motif de refus si refusée */}
            {demande.statut === "REFUSEE" && demande.motif_refus && (
              <div className="pt-2 border-t border-destructive/30">
                <p className="font-semibold text-sm text-destructive">Motif du refus :</p>
                <p className="text-sm mt-1 text-destructive/80">
                  {demande.motif_refus}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
