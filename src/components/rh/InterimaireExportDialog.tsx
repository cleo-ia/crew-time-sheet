import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchRHExportData } from "@/hooks/useRHExport";
import { generateRHExcel } from "@/lib/excelExport";
import { RHFilters, buildRHConsolidation } from "@/hooks/rhShared";

interface InterimaireExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: RHFilters;
}

interface AgenceData {
  name: string;
  count: number;
}

export const InterimaireExportDialog = ({
  open,
  onOpenChange,
  filters,
}: InterimaireExportDialogProps) => {
  const [agences, setAgences] = useState<AgenceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  // Charger les agences et compter les intérimaires
  useEffect(() => {
    const fetchAgences = async () => {
      if (!open) return;
      
      setLoading(true);
      try {
        const entrepriseId = localStorage.getItem("current_entreprise_id");
        
        // Récupérer les agences distinctes
        let query = supabase
          .from("utilisateurs")
          .select("agence_interim")
          .not("agence_interim", "is", null)
          .neq("agence_interim", "");
        
        if (entrepriseId) {
          query = query.eq("entreprise_id", entrepriseId);
        }
        
        const { data: utilisateurs } = await query;
        
        // Extraire les agences uniques
        const uniqueAgences = [...new Set(utilisateurs?.map(u => u.agence_interim).filter(Boolean) as string[])];
        
        // Pour chaque agence, compter les intérimaires avec fiches validées pour la période
        const agencesWithCount: AgenceData[] = [];
        
        for (const agence of uniqueAgences) {
          // Utiliser buildRHConsolidation pour avoir le même filtrage que l'écran
          const data = await buildRHConsolidation({
            ...filters,
            typeSalarie: "interimaire",
            agenceInterim: agence,
          });
          
          if (data.length > 0) {
            agencesWithCount.push({
              name: agence,
              count: data.length,
            });
          }
        }
        
        // Trier par nom d'agence
        agencesWithCount.sort((a, b) => a.name.localeCompare(b.name));
        setAgences(agencesWithCount);
      } catch (error) {
        console.error("Erreur lors du chargement des agences:", error);
        toast.error("Erreur lors du chargement des agences");
      } finally {
        setLoading(false);
      }
    };

    fetchAgences();
  }, [open, filters]);

  const handleExport = async (agenceName: string) => {
    setExporting(agenceName);
    try {
      const mois = (!filters.periode || filters.periode === "all") 
        ? new Date().toISOString().slice(0, 7) 
        : filters.periode;

      // Récupérer les données filtrées par agence
      const data = await fetchRHExportData(mois, {
        ...filters,
        typeSalarie: "interimaire",
        agenceInterim: agenceName,
      });

      if (data.length === 0) {
        toast.error(`Aucune donnée à exporter pour ${agenceName}`);
        return;
      }

      // Vérifier les absences non justifiées
      const employesAvecAbsencesNonQualifiees = data.filter(emp => {
        return emp.detailJours?.some(
          jour => jour.isAbsent && (!jour.typeAbsence || jour.typeAbsence === "A_QUALIFIER")
        );
      });

      if (employesAvecAbsencesNonQualifiees.length > 0) {
        const nomsSalaries = employesAvecAbsencesNonQualifiees
          .map(e => `${e.prenom} ${e.nom}`)
          .join(", ");
        
        toast.error(
          `Impossible d'exporter : des salariés ont des absences non justifiées.\n\nSalariés concernés : ${nomsSalaries}`,
          { duration: 8000 }
        );
        return;
      }

      // Générer l'Excel avec nom de fichier personnalisé
      const fileName = await generateRHExcel(data, mois, `Interimaires-${agenceName}`);
      toast.success(`Export généré : ${fileName}`);
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      toast.error("Erreur lors de la génération de l'export");
    } finally {
      setExporting(null);
    }
  };

  const periodeLabel = filters.periode && filters.periode !== "all" 
    ? new Date(filters.periode + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : "Toutes périodes";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Export par agence d'intérim
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4">
          Période : <span className="font-medium text-foreground">{periodeLabel}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : agences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun intérimaire avec des fiches validées pour cette période
          </div>
        ) : (
          <div className="space-y-3">
            {agences.map((agence) => (
              <div
                key={agence.name}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{agence.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {agence.count} intérimaire{agence.count > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleExport(agence.name)}
                  disabled={exporting !== null}
                >
                  {exporting === agence.name ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      Exporter
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
