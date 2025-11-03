import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Clock, ChevronRight, Calendar, User, Loader2 } from "lucide-react";
import { useFichesByStatus } from "@/hooks/useFiches";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FichesListProps {
  status: string;
  filters: any;
  onSelectFiche: (id: string) => void;
}

export const FichesList = ({ status, filters, onSelectFiche }: FichesListProps) => {
  const { data: rawFiches, isLoading } = useFichesByStatus(status, filters);

  // Filtre de sécurité frontend pour garantir la cohérence du statut
  const fiches = useMemo(() => {
    if (!rawFiches) return [];
    return rawFiches.filter((fiche: any) => 
      fiche.fiches && fiche.fiches.every((f: any) => f.statut === status)
    );
  }, [rawFiches, status]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fiches || fiches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Aucune fiche à afficher</p>
        <p className="text-sm mt-2">Aucune fiche ne correspond à ces critères</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fiches.map((fiche: any) => {
        const chefNom = fiche.chef ? `${fiche.chef.prenom} ${fiche.chef.nom}` : "Non assigné";
        const chantierNom = fiche.chantier?.nom || "Chantier inconnu";
        
        // Format week display
        let semaineDisplay = fiche.semaine;
        try {
          const weekDate = new Date(fiche.semaine);
          if (!isNaN(weekDate.getTime())) {
            semaineDisplay = `Semaine du ${format(weekDate, "dd/MM/yyyy", { locale: fr })}`;
          }
        } catch (e) {
          // Keep original semaine if parsing fails
        }

        return (
          <Card
            key={fiche.id}
            className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-border/50"
            onClick={() => onSelectFiche(fiche.id)}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Main Info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{chantierNom}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{semaineDisplay}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Chef: {chefNom}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {fiche.nombre_macons} maçon{fiche.nombre_macons > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {fiche.total_heures}h total
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <Button variant="outline" className="md:w-auto w-full">
                Voir la fiche
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
