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
  modified: Partial<RHExportEmployee> & {
    // Absences individuelles
    absenceCP?: number;
    absenceRTT?: number;
    absenceAM?: number;
    absenceMP?: number;
    absenceAT?: number;
    absenceCongeParental?: number;
    absenceIntemperies?: number;
    absenceCPSS?: number;
    absenceAbsInj?: number;
    absenceDate?: string;
    // Heures supp
    heuresSupp50?: number;
    // Trajets individuels
    trajetT1?: number;
    trajetT2?: number;
    trajetT3?: number;
    trajetT4?: number;
    trajetT5?: number;
    trajetT6?: number;
    trajetT7?: number;
    trajetT8?: number;
    trajetT9?: number;
    trajetT10?: number;
    trajetT11?: number;
    trajetT12?: number;
    trajetT13?: number;
    trajetT14?: number;
    trajetT15?: number;
    trajetT16?: number;
    trajetT17?: number;
    trajetT31?: number;
    trajetT35?: number;
    trajetGD?: number;
    trajetTotal?: number;
    // Administratif
    acomptes?: string;
    prets?: string;
    commentairesAdmin?: string;
    totalSaisie?: string;
    saisieDuMois?: string;
    commentairesSaisie?: string;
    // Régularisation
    regularisationM1?: string;
    autresElements?: string;
  };
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

  const handleCellChange = (rowIndex: number, field: string, value: any) => {
    setRows(prev => {
      const newRows = [...prev];
      const row = newRows[rowIndex];
      
      // Parse numeric values if needed
      const parsedValue = typeof value === 'string' && !isNaN(parseFloat(value))
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
                  <EditableCell value={row.modified.absenceDate ?? "-"} onChange={(v) => handleCellChange(index, 'absenceDate', v)} type="text" isModified={row.modified.absenceDate !== undefined} />
                  <EditableCell value={row.modified.absenceCP ?? absencesByType.CP ?? 0} onChange={(v) => handleCellChange(index, 'absenceCP', v)} type="number" isModified={row.modified.absenceCP !== undefined} />
                  <EditableCell value={row.modified.absenceRTT ?? absencesByType.RTT ?? 0} onChange={(v) => handleCellChange(index, 'absenceRTT', v)} type="number" isModified={row.modified.absenceRTT !== undefined} />
                  <EditableCell value={row.modified.absenceAM ?? absencesByType.AM ?? 0} onChange={(v) => handleCellChange(index, 'absenceAM', v)} type="number" isModified={row.modified.absenceAM !== undefined} />
                  <EditableCell value={row.modified.absenceMP ?? absencesByType.MP ?? 0} onChange={(v) => handleCellChange(index, 'absenceMP', v)} type="number" isModified={row.modified.absenceMP !== undefined} />
                  <EditableCell value={row.modified.absenceAT ?? absencesByType.AT ?? 0} onChange={(v) => handleCellChange(index, 'absenceAT', v)} type="number" isModified={row.modified.absenceAT !== undefined} />
                  <EditableCell value={row.modified.absenceCongeParental ?? absencesByType.CONGE_PARENTAL ?? 0} onChange={(v) => handleCellChange(index, 'absenceCongeParental', v)} type="number" isModified={row.modified.absenceCongeParental !== undefined} />
                  <EditableCell value={row.modified.absenceIntemperies ?? absencesByType.HI ?? 0} onChange={(v) => handleCellChange(index, 'absenceIntemperies', v)} type="number" isModified={row.modified.absenceIntemperies !== undefined} />
                  <EditableCell value={row.modified.absenceCPSS ?? absencesByType.CPSS ?? 0} onChange={(v) => handleCellChange(index, 'absenceCPSS', v)} type="number" isModified={row.modified.absenceCPSS !== undefined} />
                  <EditableCell value={row.modified.absenceAbsInj ?? absencesByType.ABS_INJ ?? 0} onChange={(v) => handleCellChange(index, 'absenceAbsInj', v)} type="number" isModified={row.modified.absenceAbsInj !== undefined} />
                  
                  {/* HEURES SUPP */}
                  <EditableCell value={row.modified.heuresSupp ?? data.heuresSupp ?? 0} onChange={(v) => handleCellChange(index, 'heuresSupp', v)} type="number" isModified={row.modified.heuresSupp !== undefined} />
                  <EditableCell value={row.modified.heuresSupp50 ?? 0} onChange={(v) => handleCellChange(index, 'heuresSupp50', v)} type="number" isModified={row.modified.heuresSupp50 !== undefined} />
                  
                  {/* REPAS */}
                  <EditableCell value={row.modified.indemnitesRepas ?? data.indemnitesRepas ?? 0} onChange={(v) => handleCellChange(index, 'indemnitesRepas', v)} type="number" isModified={row.modified.indemnitesRepas !== undefined} />
                  
                  {/* TRAJETS */}
                  <EditableCell value={row.modified.trajetTotal ?? ((data.indemnitesTrajet || 0) + (data.indemnitesTrajetPerso || 0))} onChange={(v) => handleCellChange(index, 'trajetTotal', v)} type="number" isModified={row.modified.trajetTotal !== undefined} />
                  <EditableCell value={row.modified.indemnitesTrajetPerso ?? data.indemnitesTrajetPerso ?? 0} onChange={(v) => handleCellChange(index, 'indemnitesTrajetPerso', v)} type="number" isModified={row.modified.indemnitesTrajetPerso !== undefined} />
                  <EditableCell value={row.modified.trajetT1 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT1', v)} type="number" isModified={row.modified.trajetT1 !== undefined} />
                  <EditableCell value={row.modified.trajetT2 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT2', v)} type="number" isModified={row.modified.trajetT2 !== undefined} />
                  <EditableCell value={row.modified.trajetT3 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT3', v)} type="number" isModified={row.modified.trajetT3 !== undefined} />
                  <EditableCell value={row.modified.trajetT4 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT4', v)} type="number" isModified={row.modified.trajetT4 !== undefined} />
                  <EditableCell value={row.modified.trajetT5 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT5', v)} type="number" isModified={row.modified.trajetT5 !== undefined} />
                  <EditableCell value={row.modified.trajetT6 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT6', v)} type="number" isModified={row.modified.trajetT6 !== undefined} />
                  <EditableCell value={row.modified.trajetT7 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT7', v)} type="number" isModified={row.modified.trajetT7 !== undefined} />
                  <EditableCell value={row.modified.trajetT8 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT8', v)} type="number" isModified={row.modified.trajetT8 !== undefined} />
                  <EditableCell value={row.modified.trajetT9 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT9', v)} type="number" isModified={row.modified.trajetT9 !== undefined} />
                  <EditableCell value={row.modified.trajetT10 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT10', v)} type="number" isModified={row.modified.trajetT10 !== undefined} />
                  <EditableCell value={row.modified.trajetT11 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT11', v)} type="number" isModified={row.modified.trajetT11 !== undefined} />
                  <EditableCell value={row.modified.trajetT12 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT12', v)} type="number" isModified={row.modified.trajetT12 !== undefined} />
                  <EditableCell value={row.modified.trajetT13 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT13', v)} type="number" isModified={row.modified.trajetT13 !== undefined} />
                  <EditableCell value={row.modified.trajetT14 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT14', v)} type="number" isModified={row.modified.trajetT14 !== undefined} />
                  <EditableCell value={row.modified.trajetT15 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT15', v)} type="number" isModified={row.modified.trajetT15 !== undefined} />
                  <EditableCell value={row.modified.trajetT16 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT16', v)} type="number" isModified={row.modified.trajetT16 !== undefined} />
                  <EditableCell value={row.modified.trajetT17 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT17', v)} type="number" isModified={row.modified.trajetT17 !== undefined} />
                  <EditableCell value={row.modified.trajetT31 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT31', v)} type="number" isModified={row.modified.trajetT31 !== undefined} />
                  <EditableCell value={row.modified.trajetT35 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT35', v)} type="number" isModified={row.modified.trajetT35 !== undefined} />
                  <EditableCell value={row.modified.trajetGD ?? ((data.indemnitesTrajet || 0) + (data.indemnitesTrajetPerso || 0))} onChange={(v) => handleCellChange(index, 'trajetGD', v)} type="number" isModified={row.modified.trajetGD !== undefined} />
                  
                  {/* ADMINISTRATIF */}
                  <EditableCell value={row.modified.acomptes ?? "-"} onChange={(v) => handleCellChange(index, 'acomptes', v)} type="text" isModified={row.modified.acomptes !== undefined} />
                  <EditableCell value={row.modified.prets ?? "-"} onChange={(v) => handleCellChange(index, 'prets', v)} type="text" isModified={row.modified.prets !== undefined} />
                  <EditableCell value={row.modified.commentairesAdmin ?? "-"} onChange={(v) => handleCellChange(index, 'commentairesAdmin', v)} type="text" isModified={row.modified.commentairesAdmin !== undefined} />
                  <EditableCell value={row.modified.totalSaisie ?? "-"} onChange={(v) => handleCellChange(index, 'totalSaisie', v)} type="text" isModified={row.modified.totalSaisie !== undefined} />
                  <EditableCell value={row.modified.saisieDuMois ?? "-"} onChange={(v) => handleCellChange(index, 'saisieDuMois', v)} type="text" isModified={row.modified.saisieDuMois !== undefined} />
                  <EditableCell value={row.modified.commentairesSaisie ?? "-"} onChange={(v) => handleCellChange(index, 'commentairesSaisie', v)} type="text" isModified={row.modified.commentairesSaisie !== undefined} />
                  
                  {/* RÉGULARISATION */}
                  <EditableCell value={row.modified.regularisationM1 ?? (data.detailJours?.map(j => j.regularisationM1).filter(Boolean).join(" | ") || "-")} onChange={(v) => handleCellChange(index, 'regularisationM1', v)} type="text" isModified={row.modified.regularisationM1 !== undefined} />
                  <EditableCell value={row.modified.autresElements ?? (data.detailJours?.map(j => j.autresElements).filter(Boolean).join(" | ") || "-")} onChange={(v) => handleCellChange(index, 'autresElements', v)} type="text" isModified={row.modified.autresElements !== undefined} />
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
