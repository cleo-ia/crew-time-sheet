import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import { Download, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { generateRHExcel } from "@/lib/excelExport";
import { fetchRHExportData, RHExportEmployee } from "@/hooks/useRHExport";
import { RHFilters } from "@/hooks/rhShared";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RHPreExportProps {
  filters: RHFilters;
}

type EditableRow = {
  original: RHExportEmployee;
  modified: Partial<RHExportEmployee>;
  isModified: boolean;
};

export const RHPreExport = ({ filters }: RHPreExportProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRHExportData(filters.periode || "", filters);
      const editableRows: EditableRow[] = data.map(emp => ({
        original: emp,
        modified: {},
        isModified: false
      }));
      setRows(editableRows);
      setIsDataLoaded(true);
    } catch (error) {
      console.error("Erreur chargement données pré-export:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellChange = (rowIndex: number, field: keyof RHExportEmployee, value: any) => {
    setRows(prev => {
      const newRows = [...prev];
      const row = newRows[rowIndex];
      
      // Parse numeric values
      const parsedValue = typeof row.original[field] === 'number' && typeof value === 'string'
        ? parseFloat(value) || 0
        : value;
      
      (row.modified as any)[field] = parsedValue;
      row.isModified = Object.keys(row.modified).length > 0;
      
      return newRows;
    });
  };

  const handleReset = () => {
    setRows(prev => prev.map(row => ({
      ...row,
      modified: {},
      isModified: false
    })));
    toast.success("Modifications annulées");
  };

  const handleExport = async () => {
    if (rows.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    setIsLoading(true);
    try {
      // Merge original + modified data
      const mergedData: RHExportEmployee[] = rows.map(row => ({
        ...row.original,
        ...row.modified
      }));

      const filename = await generateRHExcel(mergedData, filters.periode || "");
      toast.success(`Excel généré : ${filename}`);
    } catch (error) {
      console.error("Erreur export Excel:", error);
      toast.error("Erreur lors de la génération de l'Excel");
    } finally {
      setIsLoading(false);
    }
  };

  const modifiedCount = useMemo(() => rows.filter(r => r.isModified).length, [rows]);

  if (!isDataLoaded) {
    return (
      <div className="space-y-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cliquez sur "Charger les données" pour visualiser et modifier les données avant export Excel.
          </AlertDescription>
        </Alert>
        <Button onClick={loadData} disabled={isLoading}>
          {isLoading ? "Chargement..." : "Charger les données"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={handleExport} disabled={isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Générer l'Excel {modifiedCount > 0 && `(${modifiedCount} modif.)`}
          </Button>
          {modifiedCount > 0 && (
            <Button onClick={handleReset} variant="outline" disabled={isLoading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {rows.length} salarié{rows.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="h-[600px] border rounded-lg overflow-auto">
        <Table className="min-w-[5000px]">
          <TableHeader>
            <TableRow>
              {/* DONNÉES CONTRACTUELLES (14 colonnes) */}
              <TableHead className="bg-slate-100 sticky left-0 z-10 bg-background shadow-sm min-w-[100px]">Matricule</TableHead>
              <TableHead className="bg-slate-100 sticky left-[100px] z-10 bg-background shadow-sm min-w-[120px]">Nom</TableHead>
              <TableHead className="bg-slate-100 sticky left-[220px] z-10 bg-background shadow-sm min-w-[120px]">Prénom</TableHead>
              <TableHead className="bg-slate-100 min-w-[80px]">Echelon</TableHead>
              <TableHead className="bg-slate-100 min-w-[80px]">Niveau</TableHead>
              <TableHead className="bg-slate-100 min-w-[80px]">Degré</TableHead>
              <TableHead className="bg-slate-100 min-w-[100px]">Statut</TableHead>
              <TableHead className="bg-slate-100 min-w-[150px]">Libellé emploi</TableHead>
              <TableHead className="bg-slate-100 min-w-[100px]">Type contrat</TableHead>
              <TableHead className="bg-slate-100 min-w-[100px]">Horaire mensuel</TableHead>
              <TableHead className="bg-slate-100 min-w-[120px]">Heures supp mensualisées</TableHead>
              <TableHead className="bg-slate-100 min-w-[100px]">Forfait jours</TableHead>
              <TableHead className="bg-slate-100 min-w-[120px]">Heures réelles effectuées</TableHead>
              <TableHead className="bg-slate-100 min-w-[100px]">Salaire de base</TableHead>
              
              {/* ABSENCES EN HEURES (10 colonnes) */}
              <TableHead className="bg-amber-50 min-w-[150px]">DATE</TableHead>
              <TableHead className="bg-amber-50 min-w-[70px]">CP</TableHead>
              <TableHead className="bg-amber-50 min-w-[70px]">RTT</TableHead>
              <TableHead className="bg-amber-50 min-w-[70px]">AM</TableHead>
              <TableHead className="bg-amber-50 min-w-[70px]">MP</TableHead>
              <TableHead className="bg-amber-50 min-w-[70px]">AT</TableHead>
              <TableHead className="bg-amber-50 min-w-[120px]">Congé parental</TableHead>
              <TableHead className="bg-amber-50 min-w-[100px]">Intempéries</TableHead>
              <TableHead className="bg-amber-50 min-w-[70px]">CPSS</TableHead>
              <TableHead className="bg-amber-50 min-w-[80px]">ABS INJ</TableHead>
              
              {/* HEURES SUPP (2 colonnes) */}
              <TableHead className="bg-blue-50 min-w-[100px]">h supp à 25%</TableHead>
              <TableHead className="bg-blue-50 min-w-[100px]">h supp à 50%</TableHead>
              
              {/* REPAS (1 colonne) */}
              <TableHead className="bg-green-50 min-w-[100px]">NB PANIERS</TableHead>
              
              {/* TRAJETS (20 colonnes) */}
              <TableHead className="bg-cyan-50 min-w-[100px]">TOTAL</TableHead>
              <TableHead className="bg-cyan-50 min-w-[80px]">T Perso</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T1</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T2</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T3</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T4</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T5</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T6</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T7</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T8</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T9</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T10</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T11</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T12</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T13</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T14</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T15</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T16</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T17</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T31</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">T35</TableHead>
              <TableHead className="bg-cyan-50 min-w-[60px]">GD</TableHead>
              
              {/* ADMINISTRATIF (6 colonnes) */}
              <TableHead className="bg-orange-50 min-w-[100px]">ACOMPTES</TableHead>
              <TableHead className="bg-orange-50 min-w-[100px]">PRETS</TableHead>
              <TableHead className="bg-orange-50 min-w-[150px]">COMMENTAIRES</TableHead>
              <TableHead className="bg-orange-50 min-w-[120px]">TOTAL SAISIE</TableHead>
              <TableHead className="bg-orange-50 min-w-[120px]">SAISIE DU MOIS</TableHead>
              <TableHead className="bg-orange-50 min-w-[150px]">COMMENTAIRES</TableHead>
              
              {/* RÉGULARISATION (2 colonnes) */}
              <TableHead className="bg-purple-50 min-w-[200px]">REGULARISATION M-1</TableHead>
              <TableHead className="bg-purple-50 min-w-[200px]">Autres éléments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const data = { ...row.original, ...row.modified };
              
              // Calculer les absences par type
              const absencesByType: Record<string, number> = {};
              data.detailJours?.forEach(jour => {
                if (jour.typeAbsence && jour.heures) {
                  absencesByType[jour.typeAbsence] = (absencesByType[jour.typeAbsence] || 0) + jour.heures;
                }
              });
              
              return (
                <TableRow key={index} className={row.isModified ? "bg-blue-50/30" : ""}>
                  {/* DONNÉES CONTRACTUELLES */}
                  <TableCell className="sticky left-0 z-10 bg-background font-mono text-xs">{data.matricule}</TableCell>
                  <TableCell className="sticky left-[100px] z-10 bg-background font-medium">{data.nom}</TableCell>
                  <TableCell className="sticky left-[220px] z-10 bg-background">{data.prenom}</TableCell>
                  <TableCell className="text-xs">{data.echelon || "-"}</TableCell>
                  <TableCell className="text-xs">{data.niveau || "-"}</TableCell>
                  <TableCell className="text-xs">{data.degre || "-"}</TableCell>
                  <TableCell className="text-xs">{data.statut || "-"}</TableCell>
                  <TableCell className="text-xs">{data.metier}</TableCell>
                  <TableCell className="text-xs">{data.type_contrat || "-"}</TableCell>
                  <TableCell className="text-xs">{data.horaire || "-"}</TableCell>
                  <TableCell className="text-xs">{data.heures_supp_mensualisees || "-"}</TableCell>
                  <TableCell className="text-xs">{data.forfait_jours ? "Oui" : "-"}</TableCell>
                  <TableCell className="text-xs font-medium">{data.heuresNormales}</TableCell>
                  <TableCell className="text-xs">{data.salaire}</TableCell>
                  
                  {/* ABSENCES EN HEURES */}
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs">{absencesByType.CP || 0}</TableCell>
                  <TableCell className="text-xs">{absencesByType.RTT || 0}</TableCell>
                  <TableCell className="text-xs">{absencesByType.AM || 0}</TableCell>
                  <TableCell className="text-xs">{absencesByType.MP || 0}</TableCell>
                  <TableCell className="text-xs">{absencesByType.AT || 0}</TableCell>
                  <TableCell className="text-xs">{absencesByType.CONGE_PARENTAL || 0}</TableCell>
                  <TableCell className="text-xs">{absencesByType.HI || 0}</TableCell>
                  <TableCell className="text-xs">{absencesByType.CPSS || 0}</TableCell>
                  <TableCell className="text-xs">{absencesByType.ABS_INJ || 0}</TableCell>
                  
                  {/* HEURES SUPP */}
                  <TableCell className="text-xs">{data.heuresSupp || 0}</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  
                  {/* REPAS */}
                  <TableCell className="text-xs">{data.indemnitesRepas || 0}</TableCell>
                  
                  {/* TRAJETS */}
                  <TableCell className="text-xs">{(data.indemnitesTrajet || 0) + (data.indemnitesTrajetPerso || 0)}</TableCell>
                  <TableCell className="text-xs">{data.indemnitesTrajetPerso || 0}</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">0</TableCell>
                  <TableCell className="text-xs">{(data.indemnitesTrajet || 0) + (data.indemnitesTrajetPerso || 0)}</TableCell>
                  
                  {/* ADMINISTRATIF */}
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs">-</TableCell>
                  
                  {/* RÉGULARISATION */}
                  <TableCell className="text-xs">{data.detailJours?.map(j => j.regularisationM1).filter(Boolean).join(" | ") || "-"}</TableCell>
                  <TableCell className="text-xs">{data.detailJours?.map(j => j.autresElements).filter(Boolean).join(" | ") || "-"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// Composant cellule éditable
const EditableCell = ({ 
  value, 
  onChange, 
  type = "number", 
  isModified = false,
  disabled = false
}: { 
  value: number | string; 
  onChange: (v: any) => void; 
  type?: "number" | "text";
  isModified?: boolean;
  disabled?: boolean;
}) => {
  return (
    <TableCell className="p-1">
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`h-8 text-xs text-center ${isModified ? 'border-blue-500 border-2' : ''} ${disabled ? 'bg-muted' : ''}`}
      />
    </TableCell>
  );
};
