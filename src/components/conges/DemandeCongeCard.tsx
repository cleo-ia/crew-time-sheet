import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, X, Clock, CheckCircle2, XCircle, FileWarning, PenLine } from "lucide-react";
import type { DemandeConge } from "@/hooks/useDemandesConges";
import { DemandeCongeDetailDialog } from "./DemandeCongeDetailDialog";

interface DemandeCongeCardProps {
  demande: DemandeConge;
  showActions?: boolean;
  onValidate?: (demandeId: string) => void;
  onRefuse?: (demandeId: string) => void;
  isValidating?: boolean;
}

const statutConfig = {
  EN_ATTENTE: { label: "En attente", variant: "secondary" as const, icon: Clock },
  VALIDEE_CONDUCTEUR: { label: "Validée conducteur", variant: "outline" as const, icon: CheckCircle2 },
  VALIDEE_RH: { label: "Validée", variant: "default" as const, icon: CheckCircle2 },
  REFUSEE: { label: "Refusée", variant: "destructive" as const, icon: XCircle },
};

const typeCongeLabels: Record<string, string> = {
  CP: "Congés payés",
  RTT: "RTT",
  MALADIE: "Arrêt maladie",
  AUTRE: "Autre",
  SANS_SOLDE: "Congés sans solde",
  ABSENCE_AUTORISEE: "Absence autorisée",
  ABSENCE_RECUPEREE: "Absence récupérée",
  DECES: "Congé décès",
  NAISSANCE: "Congé naissance",
  MARIAGE: "Congé mariage",
};

const typesRequiringJustificatif = ["MALADIE", "DECES", "NAISSANCE", "MARIAGE"];

export const DemandeCongeCard: React.FC<DemandeCongeCardProps> = ({
  demande,
  showActions = false,
  onValidate,
  onRefuse,
  isValidating = false,
}) => {
  const [detailOpen, setDetailOpen] = useState(false);
  
  const config = statutConfig[demande.statut];
  const StatusIcon = config.icon;
  const demandeurName = demande.demandeur 
    ? `${demande.demandeur.prenom || ""} ${demande.demandeur.nom || ""}`.trim() || "Inconnu"
    : "Inconnu";
  
  const requiresJustificatif = typesRequiringJustificatif.includes(demande.type_conge);
  const hasSignature = !!demande.signature_data;

  const handleCardClick = (e: React.MouseEvent) => {
    // Ne pas ouvrir le dialog si on clique sur un bouton d'action
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setDetailOpen(true);
  };

  return (
    <>
      <Card 
        className="mb-3 cursor-pointer transition-colors hover:bg-muted/50"
        onClick={handleCardClick}
      >
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Nom du demandeur (visible pour conducteur/RH) */}
              {demande.demandeur && (
                <p className="font-medium text-sm mb-1 truncate">{demandeurName}</p>
              )}
              
              {/* Type de congé */}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {typeCongeLabels[demande.type_conge] || demande.type_conge}
                </p>
                {requiresJustificatif && (
                  <Badge variant="outline" className="text-xs h-5 gap-1 text-amber-600 border-amber-300 bg-amber-50">
                    <FileWarning className="h-3 w-3" />
                    Justif. requis
                  </Badge>
                )}
              </div>
              
              {/* Dates */}
              <p className="text-sm font-medium mt-1">
                {format(new Date(demande.date_debut), "d MMM", { locale: fr })}
                {demande.date_debut !== demande.date_fin && (
                  <> → {format(new Date(demande.date_fin), "d MMM yyyy", { locale: fr })}</>
                )}
                {demande.date_debut === demande.date_fin && (
                  <> {format(new Date(demande.date_debut), "yyyy", { locale: fr })}</>
                )}
              </p>
              
              {/* Motif si présent */}
              {demande.motif && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {demande.motif}
                </p>
              )}
              
              {/* Motif de refus si refusée */}
              {demande.statut === "REFUSEE" && demande.motif_refus && (
                <p className="text-xs text-destructive mt-1">
                  Refus : {demande.motif_refus}
                </p>
              )}

              {/* Indicateur signature */}
              {hasSignature && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <PenLine className="h-3 w-3" />
                  <span>Signé</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <Badge variant={config.variant} className="whitespace-nowrap">
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              
              {/* Miniature signature si présente */}
              {hasSignature && demande.signature_data && (
                <div className="w-16 h-8 border rounded bg-background overflow-hidden">
                  <img 
                    src={demande.signature_data} 
                    alt="Signature" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              
              {/* Actions pour validation */}
              {showActions && (demande.statut === "EN_ATTENTE" || demande.statut === "VALIDEE_CONDUCTEUR") && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => onValidate?.(demande.id)}
                    disabled={isValidating}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRefuse?.(demande.id)}
                    disabled={isValidating}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog détail de la demande */}
      <DemandeCongeDetailDialog
        demande={demande}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
};