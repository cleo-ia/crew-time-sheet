import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Calendar, Truck, Package, Trash2, ChevronRight, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FicheTransportMateriauxWithDetails {
  id: string;
  chantier_id: string;
  semaine_livraison: number;
  jour_livraison: string;
  moyen_transport: string | null;
  statut: string | null;
  transmise_at: string | null;
  created_at: string | null;
  chantier?: {
    nom: string;
    code_chantier: string | null;
    ville: string | null;
    chef?: { prenom: string; nom: string } | null;
  } | null;
  lignes?: any[] | null;
}

interface TransportMateriauxFicheCardProps {
  fiche: FicheTransportMateriauxWithDetails;
  onSelect: (ficheId: string) => void;
  onDelete: (ficheId: string) => void;
}

export const TransportMateriauxFicheCard = ({
  fiche,
  onSelect,
  onDelete,
}: TransportMateriauxFicheCardProps) => {
  const isTransmise = fiche.statut === "TRANSMISE";
  const jourLivraison = new Date(fiche.jour_livraison);
  const nbMateriaux = fiche.lignes?.length || 0;

  return (
    <Card
      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
      onClick={() => onSelect(fiche.id)}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Infos principales */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Statut */}
          <div className="flex items-center gap-2">
            {isTransmise ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <Check className="h-3 w-3 mr-1" />
                Transmise
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                Brouillon
              </Badge>
            )}
          </div>

          {/* Chantier */}
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate">
                {fiche.chantier?.code_chantier && `${fiche.chantier.code_chantier} - `}
                {fiche.chantier?.nom || "Chantier inconnu"}
              </p>
              {fiche.chantier?.ville && (
                <p className="text-sm text-muted-foreground">{fiche.chantier.ville}</p>
              )}
            </div>
          </div>

          {/* Date de livraison */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(jourLivraison, "EEEE d MMMM yyyy", { locale: fr })} (S{fiche.semaine_livraison})
            </span>
          </div>

          {/* Transport et matériaux */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Truck className="h-4 w-4" />
              <span>{fiche.moyen_transport || "Non défini"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span>{nbMateriaux} matériau{nbMateriaux > 1 ? "x" : ""}</span>
            </div>
          </div>

          {/* Date de transmission */}
          {isTransmise && fiche.transmise_at && (
            <p className="text-xs text-muted-foreground">
              Transmise le {format(new Date(fiche.transmise_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!isTransmise && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce brouillon ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Le brouillon sera définitivement supprimé.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(fiche.id);
                    }}
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Card>
  );
};
