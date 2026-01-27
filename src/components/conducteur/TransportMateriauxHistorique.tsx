import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package } from "lucide-react";
import { TransportMateriauxFicheCard } from "./TransportMateriauxFicheCard";
import { useDeleteFicheTransportMateriaux } from "@/hooks/useFichesTransportMateriaux";
import { useToast } from "@/hooks/use-toast";

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

interface TransportMateriauxHistoriqueProps {
  fiches: FicheTransportMateriauxWithDetails[];
  onSelectFiche: (ficheId: string) => void;
  isLoading?: boolean;
}

export const TransportMateriauxHistorique = ({
  fiches,
  onSelectFiche,
  isLoading,
}: TransportMateriauxHistoriqueProps) => {
  const { toast } = useToast();
  const deleteFiche = useDeleteFicheTransportMateriaux();

  // Séparer brouillons et transmises
  const { brouillons, transmises } = useMemo(() => {
    const brouillons: FicheTransportMateriauxWithDetails[] = [];
    const transmises: FicheTransportMateriauxWithDetails[] = [];

    fiches.forEach((fiche) => {
      if (fiche.statut === "TRANSMISE") {
        transmises.push(fiche);
      } else {
        brouillons.push(fiche);
      }
    });

    // Tri par date de création (plus récent en premier)
    brouillons.sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    transmises.sort((a, b) => 
      new Date(b.transmise_at || b.created_at || 0).getTime() - 
      new Date(a.transmise_at || a.created_at || 0).getTime()
    );

    return { brouillons, transmises };
  }, [fiches]);

  const handleDelete = async (ficheId: string) => {
    try {
      await deleteFiche.mutateAsync(ficheId);
      toast({
        title: "✅ Brouillon supprimé",
        description: "La fiche a été supprimée avec succès.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ Erreur",
        description: error.message || "Impossible de supprimer la fiche.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (fiches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-muted-foreground">Aucune demande</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Vous n'avez pas encore créé de demande de transport matériaux.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-6 pb-4">
        {/* Section Brouillons */}
        {brouillons.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Brouillons ({brouillons.length})
            </h3>
            <div className="space-y-2">
              {brouillons.map((fiche) => (
                <TransportMateriauxFicheCard
                  key={fiche.id}
                  fiche={fiche}
                  onSelect={onSelectFiche}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section Transmises */}
        {transmises.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Transmises ({transmises.length})
            </h3>
            <div className="space-y-2">
              {transmises.map((fiche) => (
                <TransportMateriauxFicheCard
                  key={fiche.id}
                  fiche={fiche}
                  onSelect={onSelectFiche}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
