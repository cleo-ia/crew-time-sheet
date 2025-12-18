import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Download, RotateCcw, AlertCircle, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateRHExcel } from "@/lib/excelExport";
import { fetchRHExportData, RHExportEmployee } from "@/hooks/useRHExport";
import { RHFilters } from "@/hooks/rhShared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePreExportSave } from "@/hooks/usePreExportSave";
import { useLogModification } from "@/hooks/useLogModification";
import { useCurrentUserInfo } from "@/hooks/useCurrentUserInfo";

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
    absenceEcole?: number;
    absenceDate?: string;
    // Heures supp
    heuresSupp25?: number;
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
    // Commentaires du mois
    commentaires?: string;
  };
  isModified: boolean;
};

export const RHPreExport = ({ filters }: RHPreExportProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const savePreExportMutation = usePreExportSave();
  const logModification = useLogModification();
  const userInfo = useCurrentUserInfo();

  // Refs pour la synchronisation du scroll horizontal
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);

  // Synchroniser le scroll horizontal (barre sticky → tableau)
  const handleHorizontalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (tableWrapperRef.current) {
      tableWrapperRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Synchroniser le scroll horizontal (tableau → barre sticky)
  const handleTableWrapperScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

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

  const handleSaveModifications = async () => {
    const modifiedRows = rows.filter(row => row.isModified);
    
    if (modifiedRows.length === 0) {
      toast.info("Aucune modification à enregistrer");
      return;
    }

    const modifiedData = modifiedRows.map(row => {
      const absencesOverride: Record<string, number> = {};
      const trajetsOverride: Record<string, number> = {};
      
      // Collecter les absences modifiées
      if (row.modified.absenceCP !== undefined) absencesOverride.CP = row.modified.absenceCP;
      if (row.modified.absenceRTT !== undefined) absencesOverride.RTT = row.modified.absenceRTT;
      if (row.modified.absenceAM !== undefined) absencesOverride.AM = row.modified.absenceAM;
      if (row.modified.absenceMP !== undefined) absencesOverride.MP = row.modified.absenceMP;
      if (row.modified.absenceAT !== undefined) absencesOverride.AT = row.modified.absenceAT;
      if (row.modified.absenceCongeParental !== undefined) absencesOverride.CONGE_PARENTAL = row.modified.absenceCongeParental;
      if (row.modified.absenceIntemperies !== undefined) absencesOverride.HI = row.modified.absenceIntemperies;
      if (row.modified.absenceCPSS !== undefined) absencesOverride.CPSS = row.modified.absenceCPSS;
      if (row.modified.absenceAbsInj !== undefined) absencesOverride.ABS_INJ = row.modified.absenceAbsInj;
      if (row.modified.absenceEcole !== undefined) absencesOverride.ECOLE = row.modified.absenceEcole;
      
      // Collecter les trajets modifiés
      if (row.modified.trajetT1 !== undefined) trajetsOverride.T1 = row.modified.trajetT1;
      if (row.modified.trajetT2 !== undefined) trajetsOverride.T2 = row.modified.trajetT2;
      if (row.modified.trajetT3 !== undefined) trajetsOverride.T3 = row.modified.trajetT3;
      if (row.modified.trajetT4 !== undefined) trajetsOverride.T4 = row.modified.trajetT4;
      if (row.modified.trajetT5 !== undefined) trajetsOverride.T5 = row.modified.trajetT5;
      if (row.modified.trajetT6 !== undefined) trajetsOverride.T6 = row.modified.trajetT6;
      if (row.modified.trajetT7 !== undefined) trajetsOverride.T7 = row.modified.trajetT7;
      if (row.modified.trajetT8 !== undefined) trajetsOverride.T8 = row.modified.trajetT8;
      if (row.modified.trajetT9 !== undefined) trajetsOverride.T9 = row.modified.trajetT9;
      if (row.modified.trajetT10 !== undefined) trajetsOverride.T10 = row.modified.trajetT10;
      if (row.modified.trajetT11 !== undefined) trajetsOverride.T11 = row.modified.trajetT11;
      if (row.modified.trajetT12 !== undefined) trajetsOverride.T12 = row.modified.trajetT12;
      if (row.modified.trajetT13 !== undefined) trajetsOverride.T13 = row.modified.trajetT13;
      if (row.modified.trajetT14 !== undefined) trajetsOverride.T14 = row.modified.trajetT14;
      if (row.modified.trajetT15 !== undefined) trajetsOverride.T15 = row.modified.trajetT15;
      if (row.modified.trajetT16 !== undefined) trajetsOverride.T16 = row.modified.trajetT16;
      if (row.modified.trajetT17 !== undefined) trajetsOverride.T17 = row.modified.trajetT17;
      if (row.modified.trajetT31 !== undefined) trajetsOverride.T31 = row.modified.trajetT31;
      if (row.modified.trajetT35 !== undefined) trajetsOverride.T35 = row.modified.trajetT35;
      if (row.modified.trajetGD !== undefined) trajetsOverride.GD = row.modified.trajetGD;
      if (row.modified.trajetTPerso !== undefined) trajetsOverride.T_PERSO = row.modified.trajetTPerso;

      return {
        ficheId: row.original.ficheId!,
        absencesOverride: Object.keys(absencesOverride).length > 0 ? absencesOverride : undefined,
        trajetsOverride: Object.keys(trajetsOverride).length > 0 ? trajetsOverride : undefined,
        acomptes: row.modified.acomptes,
        prets: row.modified.prets,
        commentaireRH: row.modified.commentaires || row.modified.commentairesAdmin,
        notesPaie: row.modified.commentairesAdmin,
        totalSaisie: row.modified.totalSaisie,
        saisieDuMois: row.modified.saisieDuMois,
        commentaireSaisie: row.modified.commentairesSaisie,
        regularisationM1: row.modified.regularisationM1,
        autresElements: row.modified.autresElements,
      };
    });

    await savePreExportMutation.mutateAsync(modifiedData);

    // Log modifications (non-blocking)
    if (userInfo) {
      for (const row of modifiedRows) {
        const modifiedFields = Object.keys(row.modified);
        if (modifiedFields.length > 0) {
          try {
            await logModification.mutateAsync({
              ficheId: row.original.ficheId || null,
              entrepriseId: userInfo.entrepriseId,
              userId: userInfo.userId,
              userName: userInfo.userName,
              action: "modification_pre_export",
              champModifie: modifiedFields.join(", "),
              ancienneValeur: null,
              nouvelleValeur: JSON.stringify(row.modified),
              details: {
                salarie: `${row.original.prenom || ""} ${row.original.nom || ""}`.trim(),
                matricule: row.original.matricule,
                periode: filters.periode,
                champsModifies: modifiedFields,
              },
            });
          } catch (e) { console.error("Log error:", e); }
        }
      }
    }

    // Recharger les données depuis la base avec les overrides
    await loadData();
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
          {modifiedCount > 0 && (
            <Button 
              onClick={handleSaveModifications} 
              variant="default"
              disabled={savePreExportMutation.isPending}
            >
              {savePreExportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              💾 Enregistrer
            </Button>
          )}
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

      {/* Table avec barre de scroll horizontale sticky */}
      <div className="h-[600px] border rounded-lg flex flex-col relative">
        {/* Zone principale avec scroll vertical + horizontal */}
        <div 
          ref={tableWrapperRef}
          className="flex-1 overflow-y-auto overflow-x-scroll hide-scrollbar"
          onScroll={handleTableWrapperScroll}
        >
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
              <TableHead className="bg-amber-50 min-w-[70px]">ECOLE</TableHead>
              
              {/* HEURES SUPP (2 colonnes) */}
              <TableHead className="bg-blue-50 min-w-[100px]">h supp à 25%</TableHead>
              <TableHead className="bg-blue-50 min-w-[100px]">h supp à 50%</TableHead>
              
              {/* REPAS (1 colonne) */}
              <TableHead className="bg-green-50 min-w-[100px]">NB PANIERS</TableHead>
              
              {/* TRAJETS (20 colonnes) */}
              <TableHead className="bg-cyan-50 min-w-[100px]">TOTAL</TableHead>
              <TableHead className="bg-cyan-50 min-w-[80px]">T Perso</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T1</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T2</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T3</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T4</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T5</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T6</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T7</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T8</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T9</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T10</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T11</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T12</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T13</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T14</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T15</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T16</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T17</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T31</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">T35</TableHead>
              <TableHead className="bg-cyan-50 min-w-[70px]">GD</TableHead>
              
              {/* ADMINISTRATIF (6 colonnes) */}
              <TableHead className="bg-green-50 min-w-[100px]">ACOMPTES</TableHead>
              <TableHead className="bg-green-50 min-w-[100px]">PRETS</TableHead>
              <TableHead className="bg-green-50 min-w-[150px]">COMMENTAIRES</TableHead>
              <TableHead className="bg-orange-50 min-w-[120px]">TOTAL SAISIE</TableHead>
              <TableHead className="bg-orange-50 min-w-[120px]">SAISIE DU MOIS</TableHead>
              <TableHead className="bg-orange-50 min-w-[150px]">COMMENTAIRES</TableHead>
              
              {/* RÉGULARISATION (2 colonnes) */}
              <TableHead className="bg-purple-50 min-w-[200px]">REGULARISATION M-1</TableHead>
              <TableHead className="bg-purple-50 min-w-[200px]">Autres éléments</TableHead>
              
              {/* COMMENTAIRES DU MOIS */}
              <TableHead className="bg-blue-50 min-w-[180px]">COMMENTAIRES DU MOIS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const data = { ...row.original, ...row.modified };
              
              // Calculer les absences par type EN HEURES (1 jour = 7 heures)
              const absencesByType: Record<string, number> = {};
              data.detailJours?.forEach(jour => {
                if (jour.isAbsent && jour.typeAbsence) {
                  // 1 jour d'absence = 7 heures
                  absencesByType[jour.typeAbsence] = (absencesByType[jour.typeAbsence] || 0) + 7;
                }
              });
              
              // Calculer les dates d'absence (pour colonne DATE)
              const datesAbsence: string[] = [];
              data.detailJours?.forEach(jour => {
                if (jour.isAbsent) {
                  // Formater la date au format DD/MM
                  const dateObj = new Date(jour.date);
                  const jour_str = String(dateObj.getDate()).padStart(2, '0');
                  const mois_str = String(dateObj.getMonth() + 1).padStart(2, '0');
                  datesAbsence.push(`${jour_str}/${mois_str}`);
                }
              });
              const datesAbsenceFormatted = datesAbsence.length > 0 ? datesAbsence.join(', ') : '-';
              
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
                  <TableCell className="text-xs">{data.libelle_emploi || data.metier}</TableCell>
                  <TableCell className="text-xs">{data.type_contrat || "-"}</TableCell>
                  <TableCell className="text-xs">{data.horaire || "-"}</TableCell>
                  <TableCell className="text-xs">{data.heures_supp_mensualisees || "-"}</TableCell>
                  <TableCell className="text-xs">{data.forfait_jours ? "Oui" : "-"}</TableCell>
                  <TableCell className="text-xs font-medium">{data.heuresNormales}</TableCell>
                  <TableCell className="text-xs">{data.salaire}</TableCell>
                  
                  {/* ABSENCES EN HEURES */}
                  <EditableCell value={row.modified.absenceDate ?? datesAbsenceFormatted} onChange={(v) => handleCellChange(index, 'absenceDate', v)} type="text" isModified={row.modified.absenceDate !== undefined} />
                  <EditableCell value={row.modified.absenceCP ?? absencesByType.CP ?? 0} onChange={(v) => handleCellChange(index, 'absenceCP', v)} type="number" isModified={row.modified.absenceCP !== undefined} />
                  <EditableCell value={row.modified.absenceRTT ?? absencesByType.RTT ?? 0} onChange={(v) => handleCellChange(index, 'absenceRTT', v)} type="number" isModified={row.modified.absenceRTT !== undefined} />
                  <EditableCell value={row.modified.absenceAM ?? absencesByType.AM ?? 0} onChange={(v) => handleCellChange(index, 'absenceAM', v)} type="number" isModified={row.modified.absenceAM !== undefined} />
                  <EditableCell value={row.modified.absenceMP ?? absencesByType.MP ?? 0} onChange={(v) => handleCellChange(index, 'absenceMP', v)} type="number" isModified={row.modified.absenceMP !== undefined} />
                  <EditableCell value={row.modified.absenceAT ?? absencesByType.AT ?? 0} onChange={(v) => handleCellChange(index, 'absenceAT', v)} type="number" isModified={row.modified.absenceAT !== undefined} />
                  <EditableCell value={row.modified.absenceCongeParental ?? absencesByType.CONGE_PARENTAL ?? 0} onChange={(v) => handleCellChange(index, 'absenceCongeParental', v)} type="number" isModified={row.modified.absenceCongeParental !== undefined} />
                  <EditableCell value={row.modified.absenceIntemperies ?? absencesByType.HI ?? 0} onChange={(v) => handleCellChange(index, 'absenceIntemperies', v)} type="number" isModified={row.modified.absenceIntemperies !== undefined} />
                  <EditableCell value={row.modified.absenceCPSS ?? absencesByType.CPSS ?? 0} onChange={(v) => handleCellChange(index, 'absenceCPSS', v)} type="number" isModified={row.modified.absenceCPSS !== undefined} />
                  <EditableCell value={row.modified.absenceAbsInj ?? absencesByType.ABS_INJ ?? 0} onChange={(v) => handleCellChange(index, 'absenceAbsInj', v)} type="number" isModified={row.modified.absenceAbsInj !== undefined} />
                  <EditableCell value={row.modified.absenceEcole ?? absencesByType.ECOLE ?? 0} onChange={(v) => handleCellChange(index, 'absenceEcole', v)} type="number" isModified={row.modified.absenceEcole !== undefined} />
                  
                  {/* HEURES SUPP */}
                  <EditableCell value={row.modified.heuresSupp25 ?? data.heuresSupp25 ?? 0} onChange={(v) => handleCellChange(index, 'heuresSupp25', v)} type="number" isModified={row.modified.heuresSupp25 !== undefined} />
                  <EditableCell value={row.modified.heuresSupp50 ?? data.heuresSupp50 ?? 0} onChange={(v) => handleCellChange(index, 'heuresSupp50', v)} type="number" isModified={row.modified.heuresSupp50 !== undefined} />
                  
                  {/* REPAS */}
                  <EditableCell value={row.modified.indemnitesRepas ?? data.indemnitesRepas ?? 0} onChange={(v) => handleCellChange(index, 'indemnitesRepas', v)} type="number" isModified={row.modified.indemnitesRepas !== undefined} />
                  
                  {/* TRAJETS */}
                  <EditableCell value={row.modified.trajetTotal ?? ((data.indemnitesTrajet || 0) + (data.indemnitesTrajetPerso || 0))} onChange={(v) => handleCellChange(index, 'trajetTotal', v)} type="number" isModified={row.modified.trajetTotal !== undefined} />
                  <EditableCell value={row.modified.trajetTPerso ?? data.trajetTPerso ?? 0} onChange={(v) => handleCellChange(index, 'trajetTPerso', v)} type="number" isModified={row.modified.trajetTPerso !== undefined} />
                  <EditableCell value={row.modified.trajetT1 ?? data.trajetT1 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT1', v)} type="number" isModified={row.modified.trajetT1 !== undefined} />
                  <EditableCell value={row.modified.trajetT2 ?? data.trajetT2 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT2', v)} type="number" isModified={row.modified.trajetT2 !== undefined} />
                  <EditableCell value={row.modified.trajetT3 ?? data.trajetT3 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT3', v)} type="number" isModified={row.modified.trajetT3 !== undefined} />
                  <EditableCell value={row.modified.trajetT4 ?? data.trajetT4 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT4', v)} type="number" isModified={row.modified.trajetT4 !== undefined} />
                  <EditableCell value={row.modified.trajetT5 ?? data.trajetT5 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT5', v)} type="number" isModified={row.modified.trajetT5 !== undefined} />
                  <EditableCell value={row.modified.trajetT6 ?? data.trajetT6 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT6', v)} type="number" isModified={row.modified.trajetT6 !== undefined} />
                  <EditableCell value={row.modified.trajetT7 ?? data.trajetT7 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT7', v)} type="number" isModified={row.modified.trajetT7 !== undefined} />
                  <EditableCell value={row.modified.trajetT8 ?? data.trajetT8 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT8', v)} type="number" isModified={row.modified.trajetT8 !== undefined} />
                  <EditableCell value={row.modified.trajetT9 ?? data.trajetT9 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT9', v)} type="number" isModified={row.modified.trajetT9 !== undefined} />
                  <EditableCell value={row.modified.trajetT10 ?? data.trajetT10 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT10', v)} type="number" isModified={row.modified.trajetT10 !== undefined} />
                  <EditableCell value={row.modified.trajetT11 ?? data.trajetT11 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT11', v)} type="number" isModified={row.modified.trajetT11 !== undefined} />
                  <EditableCell value={row.modified.trajetT12 ?? data.trajetT12 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT12', v)} type="number" isModified={row.modified.trajetT12 !== undefined} />
                  <EditableCell value={row.modified.trajetT13 ?? data.trajetT13 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT13', v)} type="number" isModified={row.modified.trajetT13 !== undefined} />
                  <EditableCell value={row.modified.trajetT14 ?? data.trajetT14 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT14', v)} type="number" isModified={row.modified.trajetT14 !== undefined} />
                  <EditableCell value={row.modified.trajetT15 ?? data.trajetT15 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT15', v)} type="number" isModified={row.modified.trajetT15 !== undefined} />
                  <EditableCell value={row.modified.trajetT16 ?? data.trajetT16 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT16', v)} type="number" isModified={row.modified.trajetT16 !== undefined} />
                  <EditableCell value={row.modified.trajetT17 ?? data.trajetT17 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT17', v)} type="number" isModified={row.modified.trajetT17 !== undefined} />
                  <EditableCell value={row.modified.trajetT31 ?? data.trajetT31 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT31', v)} type="number" isModified={row.modified.trajetT31 !== undefined} />
                  <EditableCell value={row.modified.trajetT35 ?? data.trajetT35 ?? 0} onChange={(v) => handleCellChange(index, 'trajetT35', v)} type="number" isModified={row.modified.trajetT35 !== undefined} />
                  <EditableCell value={row.modified.trajetGD ?? data.trajetGD ?? 0} onChange={(v) => handleCellChange(index, 'trajetGD', v)} type="number" isModified={row.modified.trajetGD !== undefined} />
                  
                  {/* ADMINISTRATIF */}
                  <EditableCell value={row.modified.acomptes ?? data.acomptes ?? "-"} onChange={(v) => handleCellChange(index, 'acomptes', v)} type="text" isModified={row.modified.acomptes !== undefined} />
                  <EditableCell value={row.modified.prets ?? data.prets ?? "-"} onChange={(v) => handleCellChange(index, 'prets', v)} type="text" isModified={row.modified.prets !== undefined} />
                  <EditableCell value={row.modified.commentairesAdmin ?? data.commentaire_rh ?? "-"} onChange={(v) => handleCellChange(index, 'commentairesAdmin', v)} type="text" isModified={row.modified.commentairesAdmin !== undefined} />
                  <EditableCell value={row.modified.totalSaisie ?? data.totalSaisie ?? "-"} onChange={(v) => handleCellChange(index, 'totalSaisie', v)} type="text" isModified={row.modified.totalSaisie !== undefined} />
                  <EditableCell value={row.modified.saisieDuMois ?? data.saisieDuMois ?? "-"} onChange={(v) => handleCellChange(index, 'saisieDuMois', v)} type="text" isModified={row.modified.saisieDuMois !== undefined} />
                  <EditableCell value={row.modified.commentairesSaisie ?? data.commentaireSaisie ?? "-"} onChange={(v) => handleCellChange(index, 'commentairesSaisie', v)} type="text" isModified={row.modified.commentairesSaisie !== undefined} />
                  
                  {/* RÉGULARISATION */}
                  <EditableCell value={row.modified.regularisationM1 ?? data.regularisationM1 ?? "-"} onChange={(v) => handleCellChange(index, 'regularisationM1', v)} type="text" isModified={row.modified.regularisationM1 !== undefined} />
                  <EditableCell value={row.modified.autresElements ?? data.autresElements ?? "-"} onChange={(v) => handleCellChange(index, 'autresElements', v)} type="text" isModified={row.modified.autresElements !== undefined} />
                  
                  {/* COMMENTAIRES DU MOIS */}
                  <EditableCell value={row.modified.commentaires ?? data.commentaires ?? "-"} onChange={(v) => handleCellChange(index, 'commentaires', v)} type="text" isModified={row.modified.commentaires !== undefined} />
                </TableRow>
              );
            })}
          </TableBody>
          </Table>
        </div>
        
        {/* Barre de scroll horizontale sticky en bas */}
        <div 
          ref={horizontalScrollRef}
          className="sticky bottom-0 overflow-x-auto overflow-y-hidden bg-muted/50 border-t shrink-0"
          style={{ height: '16px' }}
          onScroll={handleHorizontalScroll}
        >
          <div className="min-w-[5000px] h-px"></div>
        </div>
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
  disabled = false,
  cellClassName = ""
}: { 
  value: number | string; 
  onChange: (v: any) => void; 
  type?: "number" | "text";
  isModified?: boolean;
  disabled?: boolean;
  cellClassName?: string;
}) => {
  return (
    <TableCell className={`p-1 ${cellClassName}`}>
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
