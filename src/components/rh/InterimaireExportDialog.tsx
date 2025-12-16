import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Download, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchRHExportData, RHExportEmployee } from "@/hooks/useRHExport";
import { generateInterimaireSimplifiedExcel } from "@/lib/excelExportInterimaire";
import { RHFilters, buildRHConsolidation } from "@/hooks/rhShared";
import { parseISOWeek } from "@/lib/weekUtils";
import { format, parseISO, startOfWeek, getISOWeek } from "date-fns";

const STORAGE_KEY = "interim_exports_done";

const loadExportedItems = (): Set<string> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const saveExportedItem = (key: string, currentSet: Set<string>): Set<string> => {
  const newSet = new Set(currentSet);
  newSet.add(key);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...newSet]));
  return newSet;
};

interface InterimaireExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: RHFilters;
}

interface AgenceData {
  name: string;
  count: number;
}

// Extraire les semaines uniques depuis les données des intérimaires
const extractWeeksFromData = (employees: RHExportEmployee[]): { value: string; label: string }[] => {
  const weeksSet = new Set<string>();
  
  for (const emp of employees) {
    if (!emp.detailJours) continue;
    for (const jour of emp.detailJours) {
      const date = parseISO(jour.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekNumber = getISOWeek(date);
      const year = date.getFullYear();
      weeksSet.add(`${year}-S${weekNumber.toString().padStart(2, "0")}`);
    }
  }
  
  return Array.from(weeksSet)
    .sort()
    .map((week) => {
      const weekDate = parseISOWeek(week);
      const startLabel = format(weekDate, "dd/MM");
      const endDate = new Date(weekDate);
      endDate.setDate(endDate.getDate() + 4);
      const endLabel = format(endDate, "dd/MM");
      return {
        value: week,
        label: `${week.replace("-S", " - S")} (${startLabel} au ${endLabel})`,
      };
    });
};

// Filtrer les données par semaine
const filterDataByWeek = (employees: RHExportEmployee[], week: string): RHExportEmployee[] => {
  if (week === "all") return employees;
  
  return employees
    .map((emp) => {
      const filteredJours = emp.detailJours?.filter((jour) => {
        const date = parseISO(jour.date);
        const weekNumber = getISOWeek(date);
        const year = date.getFullYear();
        const jourWeek = `${year}-S${weekNumber.toString().padStart(2, "0")}`;
        return jourWeek === week;
      });
      
      return { ...emp, detailJours: filteredJours };
    })
    .filter((emp) => emp.detailJours && emp.detailJours.length > 0);
};

export const InterimaireExportDialog = ({
  open,
  onOpenChange,
  filters,
}: InterimaireExportDialogProps) => {
  const [agences, setAgences] = useState<AgenceData[]>([]);
  const [allData, setAllData] = useState<Map<string, RHExportEmployee[]>>(new Map());
  const [availableWeeks, setAvailableWeeks] = useState<{ value: string; label: string }[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportedItems, setExportedItems] = useState<Set<string>>(() => loadExportedItems());

  // Générer la clé pour localStorage
  const getExportKey = useCallback((agenceName: string): string => {
    return `${selectedWeek}_${agenceName}`;
  }, [selectedWeek]);

  // Vérifier si une agence a déjà été exportée pour la semaine sélectionnée
  const isExported = useCallback((agenceName: string): boolean => {
    return exportedItems.has(getExportKey(agenceName));
  }, [exportedItems, getExportKey]);

  // Calculer les agences filtrées par semaine
  const filteredAgences = useMemo(() => {
    if (selectedWeek === "all") return agences;
    
    return agences
      .map((agence) => {
        const agenceData = allData.get(agence.name) || [];
        const filtered = filterDataByWeek(agenceData, selectedWeek);
        return { ...agence, count: filtered.length };
      })
      .filter((agence) => agence.count > 0);
  }, [agences, allData, selectedWeek]);

  // Charger les agences et compter les intérimaires
  useEffect(() => {
    const fetchAgences = async () => {
      if (!open) return;
      
      setLoading(true);
      setSelectedWeek("all"); // Reset on open
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
        
        // Pour chaque agence, récupérer les données complètes
        const agencesWithCount: AgenceData[] = [];
        const dataMap = new Map<string, RHExportEmployee[]>();
        const allEmployeesData: RHExportEmployee[] = [];
        
        for (const agence of uniqueAgences) {
          const mois = (!filters.periode || filters.periode === "all") 
            ? new Date().toISOString().slice(0, 7) 
            : filters.periode;
          
          const data = await fetchRHExportData(mois, {
            ...filters,
            typeSalarie: "interimaire",
            agenceInterim: agence,
          });
          
          if (data.length > 0) {
            agencesWithCount.push({
              name: agence,
              count: data.length,
            });
            dataMap.set(agence, data);
            allEmployeesData.push(...data);
          }
        }
        
        // Extraire les semaines disponibles
        const weeks = extractWeeksFromData(allEmployeesData);
        setAvailableWeeks(weeks);
        setAllData(dataMap);
        
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

  // Récupérer les signatures pour une liste d'employés
  const fetchSignaturesForEmployees = async (employees: RHExportEmployee[]): Promise<Map<string, string>> => {
    const signaturesMap = new Map<string, string>();
    
    // Collecter tous les ficheIds
    const ficheIds = employees
      .map((emp) => emp.ficheId)
      .filter(Boolean) as string[];
    
    if (ficheIds.length === 0) return signaturesMap;
    
    // Fetch signatures from database
    const { data: signatures } = await supabase
      .from("signatures")
      .select("fiche_id, signature_data")
      .in("fiche_id", ficheIds)
      .not("signature_data", "is", null);
    
    if (signatures) {
      for (const sig of signatures) {
        if (sig.signature_data) {
          signaturesMap.set(sig.fiche_id, sig.signature_data);
        }
      }
    }
    
    return signaturesMap;
  };

  const handleExport = async (agenceName: string) => {
    setExporting(agenceName);
    try {
      const mois = (!filters.periode || filters.periode === "all") 
        ? new Date().toISOString().slice(0, 7) 
        : filters.periode;

      // Utiliser les données déjà chargées et filtrer par semaine
      const agenceData = allData.get(agenceName) || [];
      const data = filterDataByWeek(agenceData, selectedWeek);

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

      // Récupérer les signatures
      const signaturesMap = await fetchSignaturesForEmployees(data);

      // Générer l'Excel simplifié format fiche de pointage
      const fileName = await generateInterimaireSimplifiedExcel(
        data, 
        mois, 
        agenceName, 
        selectedWeek !== "all" ? selectedWeek : undefined,
        signaturesMap
      );

      // Marquer comme exporté
      setExportedItems(prev => saveExportedItem(getExportKey(agenceName), prev));
      
      toast.success(`Export généré : ${fileName}`);
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      toast.error("Erreur lors de la génération de l'export");
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const agence of filteredAgences) {
      try {
        const mois = (!filters.periode || filters.periode === "all") 
          ? new Date().toISOString().slice(0, 7) 
          : filters.periode;

        const agenceData = allData.get(agence.name) || [];
        const data = filterDataByWeek(agenceData, selectedWeek);

        if (data.length === 0) continue;

        const employesAvecAbsencesNonQualifiees = data.filter(emp => {
          return emp.detailJours?.some(
            jour => jour.isAbsent && (!jour.typeAbsence || jour.typeAbsence === "A_QUALIFIER")
          );
        });

        if (employesAvecAbsencesNonQualifiees.length > 0) {
          errorCount++;
          continue;
        }

        // Récupérer les signatures
        const signaturesMap = await fetchSignaturesForEmployees(data);

        await generateInterimaireSimplifiedExcel(
          data, 
          mois, 
          agence.name,
          selectedWeek !== "all" ? selectedWeek : undefined,
          signaturesMap
        );
        
        // Marquer comme exporté
        setExportedItems(prev => saveExportedItem(getExportKey(agence.name), prev));
        
        successCount++;
      } catch (error) {
        console.error(`Erreur export ${agence.name}:`, error);
        errorCount++;
      }
    }

    setExportingAll(false);
    
    if (errorCount > 0) {
      toast.warning(`${successCount} fichier(s) exporté(s), ${errorCount} ignoré(s) (absences non qualifiées)`);
    } else {
      toast.success(`${successCount} fichier(s) exporté(s)`);
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

        <div className="space-y-3 mb-4">
          <div className="text-sm text-muted-foreground">
            Période : <span className="font-medium text-foreground">{periodeLabel}</span>
          </div>
          
          {availableWeeks.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Semaine :</span>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Toutes les semaines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les semaines</SelectItem>
                  {availableWeeks.map((week) => (
                    <SelectItem key={week.value} value={week.value}>
                      {week.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAgences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun intérimaire avec des fiches validées pour cette {selectedWeek !== "all" ? "semaine" : "période"}
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleExportAll}
              disabled={exportingAll || exporting !== null}
            >
              {exportingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Tout exporter ({filteredAgences.length} fichier{filteredAgences.length > 1 ? "s" : ""})
            </Button>
            
            <div className="border-t pt-3 space-y-3">
            {filteredAgences.map((agence) => (
              <div
                key={agence.name}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{agence.name}</span>
                      {isExported(agence.name) && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Exporté
                        </Badge>
                      )}
                    </div>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
