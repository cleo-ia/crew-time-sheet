import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RotateCcw, AlertCircle, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateRHExcel } from "@/lib/excelExport";
import { fetchRHExportData, RHExportEmployee } from "@/hooks/useRHExport";
import { RHFilters } from "@/hooks/rhShared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePreExportSave } from "@/hooks/usePreExportSave";
import { useLogModification } from "@/hooks/useLogModification";
import { useCurrentUserInfo } from "@/hooks/useCurrentUserInfo";
import { useEnterpriseConfig } from "@/hooks/useEnterpriseConfig";
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

// Définition des colonnes pour le header droit
const RIGHT_COLUMNS = [
  { key: "echelon", label: "Echelon", width: 80, bg: "bg-slate-100" },
  { key: "niveau", label: "Niveau", width: 80, bg: "bg-slate-100" },
  { key: "degre", label: "Degré", width: 80, bg: "bg-slate-100" },
  { key: "statut", label: "Statut", width: 100, bg: "bg-slate-100" },
  { key: "libelleEmploi", label: "Libellé emploi", width: 150, bg: "bg-slate-100" },
  { key: "typeContrat", label: "Type contrat", width: 100, bg: "bg-slate-100" },
  { key: "baseHoraire", label: "Base horaire", width: 100, bg: "bg-slate-100" },
  { key: "horaire", label: "Horaire mensuel", width: 100, bg: "bg-slate-100" },
  { key: "heuresSuppMensualisees", label: "Heures supp mensualisées", width: 120, bg: "bg-slate-100" },
  { key: "forfaitJours", label: "Forfait jours", width: 100, bg: "bg-slate-100" },
  { key: "heuresReelles", label: "Heures réelles effectuées", width: 120, bg: "bg-slate-100" },
  { key: "salaire", label: "Salaire de base", width: 100, bg: "bg-slate-100" },
  // Absences
  { key: "absenceDate", label: "DATE", width: 150, bg: "bg-amber-50" },
  { key: "absenceCP", label: "CP", width: 70, bg: "bg-amber-50" },
  { key: "absenceRTT", label: "RTT", width: 70, bg: "bg-amber-50" },
  { key: "absenceAM", label: "AM", width: 70, bg: "bg-amber-50" },
  { key: "absenceMP", label: "MP", width: 70, bg: "bg-amber-50" },
  { key: "absenceAT", label: "AT", width: 70, bg: "bg-amber-50" },
  { key: "absenceCongeParental", label: "Congé parental", width: 120, bg: "bg-amber-50" },
  { key: "absenceIntemperies", label: "Intempéries", width: 100, bg: "bg-amber-50" },
  { key: "absenceCPSS", label: "CPSS", width: 70, bg: "bg-amber-50" },
  { key: "absenceAbsInj", label: "ABS INJ", width: 80, bg: "bg-amber-50" },
  { key: "absenceEcole", label: "ECOLE", width: 70, bg: "bg-amber-50" },
  // Heures supp
  { key: "heuresSupp25", label: "h supp à 25%", width: 100, bg: "bg-blue-50" },
  { key: "heuresSupp50", label: "h supp à 50%", width: 100, bg: "bg-blue-50" },
  // Repas
  { key: "indemnitesRepas", label: "NB PANIERS", width: 100, bg: "bg-green-50" },
  // Trajets
  { key: "trajetTotal", label: "TOTAL", width: 100, bg: "bg-cyan-50" },
  { key: "trajetTPerso", label: "T Perso", width: 80, bg: "bg-cyan-50" },
  { key: "trajetT1", label: "T1", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT2", label: "T2", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT3", label: "T3", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT4", label: "T4", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT5", label: "T5", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT6", label: "T6", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT7", label: "T7", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT8", label: "T8", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT9", label: "T9", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT10", label: "T10", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT11", label: "T11", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT12", label: "T12", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT13", label: "T13", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT14", label: "T14", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT15", label: "T15", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT16", label: "T16", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT17", label: "T17", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT31", label: "T31", width: 70, bg: "bg-cyan-50" },
  { key: "trajetT35", label: "T35", width: 70, bg: "bg-cyan-50" },
  { key: "trajetGD", label: "GD", width: 70, bg: "bg-cyan-50" },
  // Administratif
  { key: "acomptes", label: "ACOMPTES", width: 100, bg: "bg-green-50" },
  { key: "prets", label: "PRETS", width: 100, bg: "bg-green-50" },
  { key: "commentairesAdmin", label: "COMMENTAIRES", width: 150, bg: "bg-green-50" },
  { key: "totalSaisie", label: "TOTAL SAISIE", width: 120, bg: "bg-orange-50" },
  { key: "saisieDuMois", label: "SAISIE DU MOIS", width: 120, bg: "bg-orange-50" },
  { key: "commentairesSaisie", label: "COMMENTAIRES", width: 150, bg: "bg-orange-50" },
  // Régularisation
  { key: "regularisationM1", label: "REGULARISATION M-1", width: 200, bg: "bg-purple-50" },
  { key: "autresElements", label: "Autres éléments", width: 200, bg: "bg-purple-50" },
  // Commentaires du mois
  { key: "commentaires", label: "COMMENTAIRES DU MOIS", width: 180, bg: "bg-blue-50" },
];

const FIXED_WIDTH = 340; // Largeur zone fixe gauche
const ROW_HEIGHT = 40; // Hauteur de ligne unifiée

export const RHPreExport = ({ filters }: RHPreExportProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [filterMetier, setFilterMetier] = useState<string>("all");
  const savePreExportMutation = usePreExportSave();
  const logModification = useLogModification();
  const userInfo = useCurrentUserInfo();
  const enterpriseConfig = useEnterpriseConfig();
  
  // Refs pour scroll synchronisé
  const [scrollLeft, setScrollLeft] = useState(0);
  const [tableWidth, setTableWidth] = useState(6000);
  const stickyScrollRef = useRef<HTMLDivElement>(null);
  const dataContainerRef = useRef<HTMLDivElement>(null);

  // Calculer la largeur totale du tableau droit
  const totalRightWidth = useMemo(() => {
    return RIGHT_COLUMNS.reduce((acc, col) => acc + col.width, 0);
  }, []);

  // Mesurer la largeur réelle du tableau scrollable
  useEffect(() => {
    setTableWidth(totalRightWidth);
  }, [totalRightWidth]);

  // La scrollbar sticky contrôle la position horizontale
  const handleStickyScroll = () => {
    if (stickyScrollRef.current) {
      setScrollLeft(stickyScrollRef.current.scrollLeft);
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

      // Calculer les baselines (valeurs calculées actuelles au moment de la sauvegarde)
      const absencesBaseline: Record<string, number> = {};
      if (Object.keys(absencesOverride).length > 0) {
        row.original.detailJours?.forEach(jour => {
          if (jour.isAbsent && jour.typeAbsence) {
            absencesBaseline[jour.typeAbsence] = (absencesBaseline[jour.typeAbsence] || 0) + 7;
          }
        });
      }

      const trajetsBaseline: Record<string, number> = {};
      if (Object.keys(trajetsOverride).length > 0) {
        trajetsBaseline.T_PERSO = row.original.trajetTPerso ?? 0;
        trajetsBaseline.T1 = row.original.trajetT1 ?? 0;
        trajetsBaseline.T2 = row.original.trajetT2 ?? 0;
        trajetsBaseline.T3 = row.original.trajetT3 ?? 0;
        trajetsBaseline.T4 = row.original.trajetT4 ?? 0;
        trajetsBaseline.T5 = row.original.trajetT5 ?? 0;
        trajetsBaseline.T6 = row.original.trajetT6 ?? 0;
        trajetsBaseline.T7 = row.original.trajetT7 ?? 0;
        trajetsBaseline.T8 = row.original.trajetT8 ?? 0;
        trajetsBaseline.T9 = row.original.trajetT9 ?? 0;
        trajetsBaseline.T10 = row.original.trajetT10 ?? 0;
        trajetsBaseline.T11 = row.original.trajetT11 ?? 0;
        trajetsBaseline.T12 = row.original.trajetT12 ?? 0;
        trajetsBaseline.T13 = row.original.trajetT13 ?? 0;
        trajetsBaseline.T14 = row.original.trajetT14 ?? 0;
        trajetsBaseline.T15 = row.original.trajetT15 ?? 0;
        trajetsBaseline.T16 = row.original.trajetT16 ?? 0;
        trajetsBaseline.T17 = row.original.trajetT17 ?? 0;
        trajetsBaseline.T31 = row.original.trajetT31 ?? 0;
        trajetsBaseline.T35 = row.original.trajetT35 ?? 0;
        trajetsBaseline.GD = row.original.trajetGD ?? 0;
      }

      return {
        ficheId: row.original.ficheId!,
        absencesOverride: Object.keys(absencesOverride).length > 0 ? absencesOverride : undefined,
        trajetsOverride: Object.keys(trajetsOverride).length > 0 ? trajetsOverride : undefined,
        absencesBaseline: Object.keys(absencesBaseline).length > 0 ? absencesBaseline : undefined,
        trajetsBaseline: Object.keys(trajetsBaseline).length > 0 ? trajetsBaseline : undefined,
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

      const filename = await generateRHExcel(mergedData, filters.periode || "", undefined, {
        entrepriseNom: enterpriseConfig?.nom,
        dossierRef: enterpriseConfig?.dossierRef,
      });
      toast.success(`Excel généré : ${filename}`);
    } catch (error) {
      console.error("Erreur export Excel:", error);
      toast.error("Erreur lors de la génération de l'Excel");
    } finally {
      setIsLoading(false);
    }
  };

  const modifiedCount = useMemo(() => rows.filter(r => r.isModified).length, [rows]);

  // Filtrer les lignes par métier
  const filteredRows = useMemo(() => {
    if (filterMetier === "all") return rows;
    return rows.filter(row => row.original.metier === filterMetier);
  }, [rows, filterMetier]);

  // Helper : résoudre override vs baseline vs calculé
  const resolveOverride = (
    localEdit: number | undefined,
    savedOverride: number | undefined,
    savedBaseline: number | undefined,
    calculated: number
  ): number => {
    // 1. Modification locale en session -> prioritaire
    if (localEdit !== undefined) return localEdit;
    // 2. Override sauvegardé avec baseline
    if (savedOverride !== undefined && savedBaseline !== undefined) {
      if (savedBaseline === calculated) {
        // Données source inchangées -> garder l'override tel quel
        return savedOverride;
      } else {
        // Données source modifiées -> reporter le delta
        const delta = savedOverride - savedBaseline;
        if (delta === 0) return calculated; // pas de modif manuelle réelle
        return calculated + delta;
      }
    }
    // 3. Valeur calculée (pas d'override)
    return calculated;
  };

  // Fonction pour obtenir la valeur d'une cellule
  const getCellValue = (row: EditableRow, colKey: string) => {
    const data = { ...row.original, ...row.modified };
    
    // Calculer les absences par type EN HEURES (1 jour = 7 heures)
    const absencesByType: Record<string, number> = {};
    data.detailJours?.forEach(jour => {
      if (jour.isAbsent && jour.typeAbsence) {
        absencesByType[jour.typeAbsence] = (absencesByType[jour.typeAbsence] || 0) + 7;
      }
    });

    // Lire les overrides et baselines sauvegardés
    const savedAbsOverride = row.original.absences_export_override as Record<string, number> | null | undefined;
    const savedAbsBaseline = row.original.absences_baseline as Record<string, number> | null | undefined;
    const savedTrajOverride = row.original.trajets_export_override as Record<string, number> | null | undefined;
    const savedTrajBaseline = row.original.trajets_baseline as Record<string, number> | null | undefined;

    
    // Calculer les dates d'absence (pour colonne DATE)
    const datesAbsence: string[] = [];
    data.detailJours?.forEach(jour => {
      if (jour.isAbsent) {
        const dateObj = new Date(jour.date);
        const jour_str = String(dateObj.getDate()).padStart(2, '0');
        const mois_str = String(dateObj.getMonth() + 1).padStart(2, '0');
        datesAbsence.push(`${jour_str}/${mois_str}`);
      }
    });
    const datesAbsenceFormatted = datesAbsence.length > 0 ? datesAbsence.join(', ') : '-';

    switch (colKey) {
      case "echelon": return data.echelon || "-";
      case "niveau": return data.niveau || "-";
      case "degre": return data.degre || "-";
      case "statut": return data.statut || "-";
      case "libelleEmploi": return data.libelle_emploi || data.metier;
      case "typeContrat": return data.type_contrat || "-";
      case "baseHoraire": return data.base_horaire || "-";
      case "horaire": return data.horaire || "-";
      case "heuresSuppMensualisees": return data.heures_supp_mensualisees || "-";
      case "forfaitJours": return data.forfait_jours ? "Oui" : "-";
      case "heuresReelles": return data.heuresNormales;
      case "salaire": return data.salaire;
      // Absences avec logique baseline
      case "absenceDate": return row.modified.absenceDate ?? datesAbsenceFormatted;
      case "absenceCP": return resolveOverride(row.modified.absenceCP, savedAbsOverride?.CP, savedAbsBaseline?.CP, absencesByType.CP ?? 0);
      case "absenceRTT": return resolveOverride(row.modified.absenceRTT, savedAbsOverride?.RTT, savedAbsBaseline?.RTT, absencesByType.RTT ?? 0);
      case "absenceAM": return resolveOverride(row.modified.absenceAM, savedAbsOverride?.AM, savedAbsBaseline?.AM, absencesByType.AM ?? 0);
      case "absenceMP": return resolveOverride(row.modified.absenceMP, savedAbsOverride?.MP, savedAbsBaseline?.MP, absencesByType.MP ?? 0);
      case "absenceAT": return resolveOverride(row.modified.absenceAT, savedAbsOverride?.AT, savedAbsBaseline?.AT, absencesByType.AT ?? 0);
      case "absenceCongeParental": return resolveOverride(row.modified.absenceCongeParental, savedAbsOverride?.CONGE_PARENTAL, savedAbsBaseline?.CONGE_PARENTAL, absencesByType.CONGE_PARENTAL ?? 0);
      case "absenceIntemperies": return resolveOverride(row.modified.absenceIntemperies, savedAbsOverride?.HI, savedAbsBaseline?.HI, absencesByType.HI ?? 0);
      case "absenceCPSS": return resolveOverride(row.modified.absenceCPSS, savedAbsOverride?.CPSS, savedAbsBaseline?.CPSS, absencesByType.CPSS ?? 0);
      case "absenceAbsInj": return resolveOverride(row.modified.absenceAbsInj, savedAbsOverride?.ABS_INJ, savedAbsBaseline?.ABS_INJ, absencesByType.ABS_INJ ?? 0);
      case "absenceEcole": return resolveOverride(row.modified.absenceEcole, savedAbsOverride?.ECOLE, savedAbsBaseline?.ECOLE, absencesByType.ECOLE ?? 0);
      // Heures supp
      case "heuresSupp25": return row.modified.heuresSupp25 ?? data.heuresSupp25 ?? 0;
      case "heuresSupp50": return row.modified.heuresSupp50 ?? data.heuresSupp50 ?? 0;
      // Repas
      case "indemnitesRepas": return row.modified.indemnitesRepas ?? data.indemnitesRepas ?? 0;
      // Trajets
      case "trajetTotal": return row.modified.trajetTotal ?? ((data.indemnitesTrajet || 0) + (data.indemnitesTrajetPerso || 0));
      case "trajetTPerso": return resolveOverride(row.modified.trajetTPerso, savedTrajOverride?.T_PERSO, savedTrajBaseline?.T_PERSO, row.original.trajetTPerso ?? 0);
      case "trajetT1": return resolveOverride(row.modified.trajetT1, savedTrajOverride?.T1, savedTrajBaseline?.T1, row.original.trajetT1 ?? 0);
      case "trajetT2": return resolveOverride(row.modified.trajetT2, savedTrajOverride?.T2, savedTrajBaseline?.T2, row.original.trajetT2 ?? 0);
      case "trajetT3": return resolveOverride(row.modified.trajetT3, savedTrajOverride?.T3, savedTrajBaseline?.T3, row.original.trajetT3 ?? 0);
      case "trajetT4": return resolveOverride(row.modified.trajetT4, savedTrajOverride?.T4, savedTrajBaseline?.T4, row.original.trajetT4 ?? 0);
      case "trajetT5": return resolveOverride(row.modified.trajetT5, savedTrajOverride?.T5, savedTrajBaseline?.T5, row.original.trajetT5 ?? 0);
      case "trajetT6": return resolveOverride(row.modified.trajetT6, savedTrajOverride?.T6, savedTrajBaseline?.T6, row.original.trajetT6 ?? 0);
      case "trajetT7": return resolveOverride(row.modified.trajetT7, savedTrajOverride?.T7, savedTrajBaseline?.T7, row.original.trajetT7 ?? 0);
      case "trajetT8": return resolveOverride(row.modified.trajetT8, savedTrajOverride?.T8, savedTrajBaseline?.T8, row.original.trajetT8 ?? 0);
      case "trajetT9": return resolveOverride(row.modified.trajetT9, savedTrajOverride?.T9, savedTrajBaseline?.T9, row.original.trajetT9 ?? 0);
      case "trajetT10": return resolveOverride(row.modified.trajetT10, savedTrajOverride?.T10, savedTrajBaseline?.T10, row.original.trajetT10 ?? 0);
      case "trajetT11": return resolveOverride(row.modified.trajetT11, savedTrajOverride?.T11, savedTrajBaseline?.T11, row.original.trajetT11 ?? 0);
      case "trajetT12": return resolveOverride(row.modified.trajetT12, savedTrajOverride?.T12, savedTrajBaseline?.T12, row.original.trajetT12 ?? 0);
      case "trajetT13": return resolveOverride(row.modified.trajetT13, savedTrajOverride?.T13, savedTrajBaseline?.T13, row.original.trajetT13 ?? 0);
      case "trajetT14": return resolveOverride(row.modified.trajetT14, savedTrajOverride?.T14, savedTrajBaseline?.T14, row.original.trajetT14 ?? 0);
      case "trajetT15": return resolveOverride(row.modified.trajetT15, savedTrajOverride?.T15, savedTrajBaseline?.T15, row.original.trajetT15 ?? 0);
      case "trajetT16": return resolveOverride(row.modified.trajetT16, savedTrajOverride?.T16, savedTrajBaseline?.T16, row.original.trajetT16 ?? 0);
      case "trajetT17": return resolveOverride(row.modified.trajetT17, savedTrajOverride?.T17, savedTrajBaseline?.T17, row.original.trajetT17 ?? 0);
      case "trajetT31": return resolveOverride(row.modified.trajetT31, savedTrajOverride?.T31, savedTrajBaseline?.T31, row.original.trajetT31 ?? 0);
      case "trajetT35": return resolveOverride(row.modified.trajetT35, savedTrajOverride?.T35, savedTrajBaseline?.T35, row.original.trajetT35 ?? 0);
      case "trajetGD": return resolveOverride(row.modified.trajetGD, savedTrajOverride?.GD, savedTrajBaseline?.GD, row.original.trajetGD ?? 0);
      // Administratif
      case "acomptes": return row.modified.acomptes ?? data.acomptes ?? "-";
      case "prets": return row.modified.prets ?? data.prets ?? "-";
      case "commentairesAdmin": return row.modified.commentairesAdmin ?? data.commentaire_rh ?? "-";
      case "totalSaisie": return row.modified.totalSaisie ?? data.totalSaisie ?? "-";
      case "saisieDuMois": return row.modified.saisieDuMois ?? data.saisieDuMois ?? "-";
      case "commentairesSaisie": return row.modified.commentairesSaisie ?? data.commentaireSaisie ?? "-";
      // Régularisation
      case "regularisationM1": return row.modified.regularisationM1 ?? data.regularisationM1 ?? "-";
      case "autresElements": return row.modified.autresElements ?? data.autresElements ?? "-";
      // Commentaires du mois
      case "commentaires": return row.modified.commentaires ?? data.commentaires ?? "-";
      default: return "-";
    }
  };

  // Vérifier si une cellule est éditable
  const isEditableColumn = (colKey: string) => {
    const nonEditable = ["echelon", "niveau", "degre", "statut", "libelleEmploi", "typeContrat", "baseHoraire", "horaire", "heuresSuppMensualisees", "forfaitJours", "heuresReelles", "salaire"];
    return !nonEditable.includes(colKey);
  };

  // Vérifier si une cellule est modifiée
  const isCellModified = (row: EditableRow, colKey: string) => {
    return (row.modified as any)[colKey] !== undefined;
  };

  // Type de cellule
  const getCellType = (colKey: string): "number" | "text" => {
    const textColumns = ["absenceDate", "acomptes", "prets", "commentairesAdmin", "totalSaisie", "saisieDuMois", "commentairesSaisie", "regularisationM1", "autresElements", "commentaires"];
    return textColumns.includes(colKey) ? "text" : "number";
  };

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
        <div className="flex items-center gap-4">
          <Select value={filterMetier} onValueChange={setFilterMetier}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par métier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les métiers</SelectItem>
              <SelectItem value="Chef">Chefs</SelectItem>
              <SelectItem value="Maçon">Maçons</SelectItem>
              <SelectItem value="Grutier">Grutiers</SelectItem>
              <SelectItem value="Finisseur">Finisseurs</SelectItem>
              <SelectItem value="Intérimaire">Intérimaires</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {filteredRows.length} / {rows.length} salarié{rows.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Table avec colonnes sticky */}
      <div className="border rounded-lg h-[600px] flex flex-col overflow-hidden">
        
        {/* ZONE EN-TÊTES FIXES */}
        <div className="flex flex-shrink-0 border-b bg-background">
          {/* En-têtes gauche (Matricule, Nom, Prénom) - STICKY */}
          <div 
            className="flex-shrink-0 border-r shadow-[2px_0_5px_rgba(0,0,0,0.1)] z-20 bg-slate-100"
            style={{ width: FIXED_WIDTH }}
          >
            <div className="flex" style={{ height: ROW_HEIGHT }}>
              <div className="flex items-center justify-center font-medium text-sm border-r" style={{ width: 100 }}>
                Matricule
              </div>
              <div className="flex items-center justify-center font-medium text-sm border-r" style={{ width: 120 }}>
                Nom
              </div>
              <div className="flex items-center justify-center font-medium text-sm" style={{ width: 120 }}>
                Prénom
              </div>
            </div>
          </div>
          
          {/* En-têtes droite (scrollable horizontalement, synchronisé) */}
          <div className="flex-1 overflow-hidden">
            <div 
              className="flex"
              style={{ 
                transform: `translateX(-${scrollLeft}px)`, 
                width: 'fit-content',
                height: ROW_HEIGHT
              }}
            >
              {RIGHT_COLUMNS.map((col) => (
                <div 
                  key={col.key}
                  className={`flex items-center justify-center font-medium text-sm border-r ${col.bg}`}
                  style={{ minWidth: col.width, width: col.width }}
                >
                  {col.label}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* ZONE DONNÉES (scroll vertical unifié) */}
        <div 
          ref={dataContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          {filteredRows.map((row) => {
            const realIndex = rows.indexOf(row);
            const data = { ...row.original, ...row.modified };
            
            return (
              <div 
                key={realIndex} 
                className={`flex border-b ${row.isModified ? "bg-blue-50/30" : ""}`}
                style={{ height: ROW_HEIGHT }}
              >
                {/* Données gauche (Matricule, Nom, Prénom) - STICKY */}
                <div 
                  className="flex-shrink-0 flex border-r shadow-[2px_0_5px_rgba(0,0,0,0.1)] z-10 bg-background"
                  style={{ width: FIXED_WIDTH }}
                >
                  <div 
                    className="flex items-center justify-center font-mono text-xs border-r px-2"
                    style={{ width: 100 }}
                  >
                    {data.matricule}
                  </div>
                  <div 
                    className="flex items-center font-medium text-sm border-r px-2 truncate"
                    style={{ width: 120 }}
                  >
                    {data.nom}
                  </div>
                  <div 
                    className="flex items-center text-sm px-2 truncate"
                    style={{ width: 120 }}
                  >
                    {data.prenom}
                  </div>
                </div>
                
                {/* Données droite (scrollable horizontalement, synchronisé) */}
                <div className="flex-1 overflow-hidden">
                  <div 
                    className="flex"
                    style={{ 
                      transform: `translateX(-${scrollLeft}px)`, 
                      width: 'fit-content',
                      height: ROW_HEIGHT
                    }}
                  >
                    {RIGHT_COLUMNS.map((col) => {
                      const value = getCellValue(row, col.key);
                      const isEditable = isEditableColumn(col.key);
                      const isModified = isCellModified(row, col.key);
                      const cellType = getCellType(col.key);
                      
                      if (isEditable) {
                        return (
                          <div 
                            key={col.key}
                            className="flex items-center justify-center p-1 border-r"
                            style={{ minWidth: col.width, width: col.width }}
                          >
                            <Input
                              type={cellType}
                              value={value}
                              onChange={(e) => handleCellChange(realIndex, col.key, e.target.value)}
                              className={`h-8 text-xs text-center ${isModified ? 'border-blue-500 border-2' : ''}`}
                            />
                          </div>
                        );
                      } else {
                        return (
                          <div 
                            key={col.key}
                            className="flex items-center justify-center text-xs border-r px-2"
                            style={{ minWidth: col.width, width: col.width }}
                          >
                            {value}
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Scrollbar horizontale sticky en bas - SEULE source de scroll H */}
        <div className="flex border-t flex-shrink-0">
          {/* Placeholder pour aligner avec la zone fixe */}
          <div className="flex-shrink-0" style={{ width: FIXED_WIDTH }}></div>
          {/* Scrollbar pour la zone scrollable */}
          <div 
            ref={stickyScrollRef}
            className="flex-1 h-3 overflow-x-auto bg-muted/30"
            onScroll={handleStickyScroll}
          >
            <div style={{ width: `${tableWidth}px`, height: '1px' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
