import XLSX from "xlsx-js-style";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Chantier } from "@/hooks/useChantiers";
import { PlanningAffectation } from "@/hooks/usePlanningAffectations";

// Couleurs du planning
const COLORS = {
  headerBg: "1F4E79", // Bleu foncé
  chantierBg: "4472C4", // Bleu chantier
  lrRow: "FFFFFF", // Blanc pour LR
  interimRow: "E2EFDA", // Vert clair pour intérim
  appRow: "FCE4D6", // Orange clair pour apprenti
  chefRow: "FFD966", // Jaune pour chef
  insertionOk: "C6EFCE", // Vert clair
  insertionEnCours: "BDD7EE", // Bleu clair
  insertionTerminee: "C6EFCE", // Vert clair
  insertionAnnulee: "FFC7CE", // Rouge clair
  insertionPas: "D9D9D9", // Gris
};

interface EmployeData {
  id: string;
  prenom: string;
  nom: string;
  libelle_emploi?: string;
  agence_interim?: string;
  adresse_ville_courte?: string;
}

interface PlanningData {
  chantier: Chantier;
  employes: {
    employe: EmployeData;
    jours: Record<string, boolean>;
  }[];
}

// Helpers
const isApprenti = (emp: EmployeData): boolean => {
  const libelle = emp.libelle_emploi?.toLowerCase() || "";
  return libelle.includes("apprenti") || libelle.includes("alternant");
};

const isChef = (emp: EmployeData): boolean => {
  const libelle = emp.libelle_emploi?.toLowerCase() || "";
  return libelle.includes("chef");
};

const getEmployeCategory = (emp: EmployeData): string => {
  if (emp.agence_interim) return "Intérim";
  if (isApprenti(emp)) return "App";
  if (isChef(emp)) return "Chef";
  return "LR";
};

const getEmployeRowColor = (emp: EmployeData): string => {
  if (emp.agence_interim) return COLORS.interimRow;
  if (isApprenti(emp)) return COLORS.appRow;
  if (isChef(emp)) return COLORS.chefRow;
  return COLORS.lrRow;
};

const getInsertionLabel = (statut: string | null | undefined): string => {
  if (!statut || statut === "pas_insertion") return "Pas d'insertion";
  if (statut === "ok") return "OK";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
  if (statut === "annulee") return "Annulée";
  return statut;
};

const getInsertionColor = (statut: string | null | undefined): string => {
  if (!statut || statut === "pas_insertion") return COLORS.insertionPas;
  if (statut === "ok") return COLORS.insertionOk;
  if (statut === "en_cours") return COLORS.insertionEnCours;
  if (statut === "terminee") return COLORS.insertionTerminee;
  if (statut === "annulee") return COLORS.insertionAnnulee;
  return COLORS.insertionPas;
};

const shortenVille = (ville: string | undefined | null, maxLength = 15): string => {
  if (!ville) return "";
  if (ville.length <= maxLength) return ville;
  // Garder le code postal ou département si présent
  const match = ville.match(/(\d{2,5})/);
  if (match) {
    return match[1] + " " + ville.replace(match[0], "").trim().substring(0, 8);
  }
  return ville.substring(0, maxLength);
};

export const generatePlanningExcel = async (
  planningData: PlanningData[],
  weekDays: { date: string; dayName: string; fullName: string }[],
  semaine: string,
  entrepriseName: string
): Promise<string> => {
  const wb = XLSX.utils.book_new();

  // Créer les données du worksheet
  const wsData: any[][] = [];

  // === Ligne 1 : Titre ===
  wsData.push([
    `${entrepriseName} - PLANNING Main d'Œuvre - Semaine ${semaine}`,
    "", "", "", "", "", "", "", "", ""
  ]);

  // === Ligne 2 : En-têtes ===
  const headerRow = [
    "Chantier",
    "Personnel",
    "Cat.",
    "Adresse",
    "Fonction"
  ];
  weekDays.forEach(day => {
    const datePart = format(parseISO(day.date), "d/MM");
    headerRow.push(`${day.dayName}\n${datePart}`);
  });
  headerRow.push("Insertion");
  wsData.push(headerRow);

  // === Lignes de données ===
  planningData.forEach(({ chantier, employes }) => {
    // Ligne chantier (en-tête)
    const chantierRow = [
      `${chantier.code_chantier || "???"} - ${chantier.nom}`,
      `${chantier.conducteur?.prenom || ""} ${chantier.conducteur?.nom || ""}`.trim() || "Sans conducteur",
      (chantier as any).heures_hebdo_prevues || "39H",
      shortenVille(chantier.ville),
      "",
      ...weekDays.map(() => ""),
      getInsertionLabel((chantier as any).statut_insertion)
    ];
    wsData.push(chantierRow);

    // Lignes employés
    employes.forEach(({ employe, jours }) => {
      const employeRow = [
        "",
        `${employe.prenom} ${employe.nom}`,
        getEmployeCategory(employe),
        shortenVille(employe.adresse_ville_courte),
        employe.libelle_emploi?.substring(0, 15) || "",
        ...weekDays.map(day => jours[day.date] ? "1" : ""),
        ""
      ];
      wsData.push(employeRow);
    });
  });

  // Créer le worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // === Styles ===
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

  // Largeurs de colonnes
  ws["!cols"] = [
    { wch: 30 }, // Chantier
    { wch: 22 }, // Personnel
    { wch: 7 },  // Cat.
    { wch: 12 }, // Adresse
    { wch: 12 }, // Fonction
    ...weekDays.map(() => ({ wch: 6 })), // L M M J V
    { wch: 14 }  // Insertion
  ];

  // Hauteur de ligne pour le titre
  ws["!rows"] = [{ hpx: 30 }];

  // Style du titre (A1)
  if (ws["A1"]) {
    ws["A1"].s = {
      font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: COLORS.headerBg } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }

  // Merge du titre
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } } // Titre sur toute la largeur
  ];

  // Style des en-têtes (ligne 2)
  for (let c = 0; c <= 10; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 1, c });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: COLORS.headerBg } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }
  }

  // Style des données (à partir de la ligne 3)
  let currentRow = 2;
  planningData.forEach(({ chantier, employes }) => {
    // Style ligne chantier
    for (let c = 0; c <= 10; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: currentRow, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: COLORS.chantierBg } },
          alignment: { horizontal: c === 0 ? "left" : "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
      }
    }
    
    // Colonne Insertion avec couleur spécifique
    const insertionCellRef = XLSX.utils.encode_cell({ r: currentRow, c: 10 });
    if (ws[insertionCellRef]) {
      ws[insertionCellRef].s = {
        ...ws[insertionCellRef].s,
        fill: { fgColor: { rgb: getInsertionColor((chantier as any).statut_insertion) } },
        font: { bold: true, sz: 9, color: { rgb: "000000" } }
      };
    }
    
    currentRow++;

    // Style lignes employés
    employes.forEach(({ employe }) => {
      const rowColor = getEmployeRowColor(employe);
      for (let c = 0; c <= 10; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: currentRow, c });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { sz: 9 },
            fill: { fgColor: { rgb: rowColor } },
            alignment: { horizontal: c <= 1 ? "left" : "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "D0D0D0" } },
              bottom: { style: "thin", color: { rgb: "D0D0D0" } },
              left: { style: "thin", color: { rgb: "D0D0D0" } },
              right: { style: "thin", color: { rgb: "D0D0D0" } }
            }
          };
        }
      }
      currentRow++;
    });
  });

  // Ajouter au workbook
  XLSX.utils.book_append_sheet(wb, ws, "Planning");

  // Générer le fichier
  const fileName = `Planning_${entrepriseName.replace(/\s+/g, "_")}_${semaine}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return fileName;
};

// Fonction helper pour préparer les données depuis les affectations
export const preparePlanningData = (
  chantiers: Chantier[],
  affectationsByChantier: Record<string, PlanningAffectation[]>,
  weekDays: { date: string; dayName: string; fullName: string }[]
): PlanningData[] => {
  return chantiers
    .filter(c => affectationsByChantier[c.id]?.length > 0)
    .map(chantier => {
      const affectations = affectationsByChantier[chantier.id] || [];
      
      // Grouper par employé
      const employeMap = new Map<string, { employe: EmployeData; jours: Record<string, boolean> }>();
      
      affectations.forEach(aff => {
        if (!aff.employe) return;
        
        if (!employeMap.has(aff.employe_id)) {
          employeMap.set(aff.employe_id, {
            employe: aff.employe as EmployeData,
            jours: {}
          });
        }
        employeMap.get(aff.employe_id)!.jours[aff.jour] = true;
      });

      // Trier les employés : Chefs > LR > App > Intérim
      const sortOrder = (emp: EmployeData): number => {
        if (isChef(emp)) return 0;
        if (!emp.agence_interim && !isApprenti(emp)) return 1;
        if (isApprenti(emp)) return 2;
        return 3;
      };

      const employes = Array.from(employeMap.values())
        .sort((a, b) => sortOrder(a.employe) - sortOrder(b.employe));

      return { chantier, employes };
    });
};
