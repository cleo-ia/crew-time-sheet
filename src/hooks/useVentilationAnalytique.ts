import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types
export type TypeMO = 'MO' | 'MOAPP' | 'INTERIM';

export interface RecapChantierRow {
  codeAnalytique: string;
  libelle: string;
  heuresInterim: number;
  heuresMO: number;
  heuresMOAPP: number;
  total: number;
}

export interface VentilationEmployeeRow {
  salarieId: string;
  nom: string;
  prenom: string;
  agenceInterim?: string;
  typeMO: TypeMO;
  codeAnalytique: string;
  libelle: string;
  quantite: number;
  pourcentage: number;
  isTotal?: boolean;
}

// Utility functions
export const formatLibelleChantier = (codeChantier: string | null): string => {
  if (!codeChantier) return "NON AFFECTÉ";
  
  // Extraire les chiffres du code (ex: "890" depuis "CI890HENRI")
  const chiffres = codeChantier.match(/\d+/)?.[0] || '000';
  // Extraire le nom après les chiffres (ex: "HENRI" depuis "CI890HENRI")
  const nom = codeChantier.replace(/^[A-Z]*\d+/, '') || '';
  // Padder à 6 chiffres
  const codePadded = chiffres.padStart(6, '0');
  // Format final : "Chantier [000890] HENRI"
  return `Chantier [${codePadded}] ${nom}`;
};

export const getTypeMO = (utilisateur: { agence_interim: string | null; statut: string | null }): TypeMO => {
  if (utilisateur.agence_interim) return 'INTERIM';
  if (utilisateur.statut === 'Apprenti') return 'MOAPP';
  return 'MO';
};

// Helper to get weeks in a month
const getWeeksInMonth = (periode: string): string[] => {
  if (!periode || periode === "all") return [];
  
  const [year, month] = periode.split("-").map(Number);
  const weeks: string[] = [];
  
  // Get all days in the month
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    // ISO week: get Thursday of the week to determine the week number
    const thursday = new Date(d);
    thursday.setDate(thursday.getDate() - ((thursday.getDay() + 6) % 7) + 3);
    const weekYear = thursday.getFullYear();
    const weekNum = Math.ceil((((thursday.getTime() - new Date(weekYear, 0, 4).getTime()) / 86400000) + new Date(weekYear, 0, 4).getDay() + 1) / 7);
    const weekStr = `${weekYear}-S${String(weekNum).padStart(2, '0')}`;
    
    if (!weeks.includes(weekStr)) {
      weeks.push(weekStr);
    }
  }
  
  return weeks;
};

// Hook: Récap par chantier
export const useRecapChantier = (periode: string) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["ventilation-recap-chantier", periode, entrepriseId],
    queryFn: async () => {
      if (!periode || periode === "all" || !entrepriseId) return [];
      
      const weeks = getWeeksInMonth(periode);
      if (weeks.length === 0) return [];
      
      // Fetch fiches for the period with valid statuses
      const { data: fichesData, error: fichesError } = await supabase
        .from("fiches")
        .select(`
          id,
          salarie_id,
          semaine,
          utilisateurs!fiches_salarie_id_fkey (
            id,
            agence_interim,
            statut,
            entreprise_id
          )
        `)
        .in("semaine", weeks)
        .in("statut", ["ENVOYE_RH", "AUTO_VALIDE", "CLOTURE"]);
      
      if (fichesError) throw fichesError;
      if (!fichesData || fichesData.length === 0) return [];
      
      // Filter by entreprise
      const filteredFiches = fichesData.filter(f => 
        f.utilisateurs && f.utilisateurs.entreprise_id === entrepriseId
      );
      
      if (filteredFiches.length === 0) return [];
      
      const ficheIds = filteredFiches.map(f => f.id);
      
      // Fetch fiches_jours for these fiches
      const { data: joursData, error: joursError } = await supabase
        .from("fiches_jours")
        .select("fiche_id, code_chantier_du_jour, HNORM")
        .in("fiche_id", ficheIds);
      
      if (joursError) throw joursError;
      if (!joursData) return [];
      
      // Build a map fiche_id -> utilisateur
      const ficheUserMap = new Map<string, { agence_interim: string | null; statut: string | null }>();
      filteredFiches.forEach(f => {
        if (f.utilisateurs) {
          ficheUserMap.set(f.id, {
            agence_interim: f.utilisateurs.agence_interim,
            statut: f.utilisateurs.statut
          });
        }
      });
      
      // Aggregate by chantier and type MO
      const chantierAgg = new Map<string, { heuresInterim: number; heuresMO: number; heuresMOAPP: number }>();
      
      joursData.forEach(jour => {
        const user = ficheUserMap.get(jour.fiche_id);
        if (!user) return;
        
        const typeMO = getTypeMO(user);
        const code = jour.code_chantier_du_jour || "N/A";
        const heures = jour.HNORM || 0;
        
        if (!chantierAgg.has(code)) {
          chantierAgg.set(code, { heuresInterim: 0, heuresMO: 0, heuresMOAPP: 0 });
        }
        
        const agg = chantierAgg.get(code)!;
        if (typeMO === 'INTERIM') agg.heuresInterim += heures;
        else if (typeMO === 'MOAPP') agg.heuresMOAPP += heures;
        else agg.heuresMO += heures;
      });
      
      // Convert to array
      const result: RecapChantierRow[] = [];
      chantierAgg.forEach((agg, code) => {
        result.push({
          codeAnalytique: code,
          libelle: formatLibelleChantier(code === "N/A" ? null : code),
          heuresInterim: agg.heuresInterim,
          heuresMO: agg.heuresMO,
          heuresMOAPP: agg.heuresMOAPP,
          total: agg.heuresInterim + agg.heuresMO + agg.heuresMOAPP
        });
      });
      
      // Sort by code
      result.sort((a, b) => a.codeAnalytique.localeCompare(b.codeAnalytique));
      
      return result;
    },
    enabled: !!periode && periode !== "all" && !!entrepriseId
  });
};

// Hook: Ventilation Ouvrier (non-intérim)
export const useVentilationOuvrier = (periode: string) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["ventilation-ouvrier", periode, entrepriseId],
    queryFn: async () => {
      if (!periode || periode === "all" || !entrepriseId) return [];
      
      const weeks = getWeeksInMonth(periode);
      if (weeks.length === 0) return [];
      
      // Fetch fiches for the period with valid statuses
      const { data: fichesData, error: fichesError } = await supabase
        .from("fiches")
        .select(`
          id,
          salarie_id,
          semaine,
          utilisateurs!fiches_salarie_id_fkey (
            id,
            nom,
            prenom,
            agence_interim,
            statut,
            entreprise_id
          )
        `)
        .in("semaine", weeks)
        .in("statut", ["ENVOYE_RH", "AUTO_VALIDE", "CLOTURE"]);
      
      if (fichesError) throw fichesError;
      if (!fichesData || fichesData.length === 0) return [];
      
      // Filter: entreprise + non-intérimaire
      const filteredFiches = fichesData.filter(f => 
        f.utilisateurs && 
        f.utilisateurs.entreprise_id === entrepriseId &&
        !f.utilisateurs.agence_interim
      );
      
      if (filteredFiches.length === 0) return [];
      
      const ficheIds = filteredFiches.map(f => f.id);
      
      // Fetch fiches_jours
      const { data: joursData, error: joursError } = await supabase
        .from("fiches_jours")
        .select("fiche_id, code_chantier_du_jour, HNORM")
        .in("fiche_id", ficheIds);
      
      if (joursError) throw joursError;
      if (!joursData) return [];
      
      // Build maps
      const ficheUserMap = new Map<string, { id: string; nom: string; prenom: string; statut: string | null }>();
      filteredFiches.forEach(f => {
        if (f.utilisateurs) {
          ficheUserMap.set(f.id, {
            id: f.utilisateurs.id,
            nom: f.utilisateurs.nom || "",
            prenom: f.utilisateurs.prenom || "",
            statut: f.utilisateurs.statut
          });
        }
      });
      
      // Aggregate by (employee, chantier)
      // Key: salarieId___codeChantier
      const empChantierAgg = new Map<string, { heures: number; user: typeof ficheUserMap extends Map<string, infer V> ? V : never }>();
      const empTotals = new Map<string, number>();
      
      joursData.forEach(jour => {
        const user = ficheUserMap.get(jour.fiche_id);
        if (!user) return;
        
        const code = jour.code_chantier_du_jour || "N/A";
        const heures = jour.HNORM || 0;
        const key = `${user.id}___${code}`;
        
        if (!empChantierAgg.has(key)) {
          empChantierAgg.set(key, { heures: 0, user });
        }
        empChantierAgg.get(key)!.heures += heures;
        
        empTotals.set(user.id, (empTotals.get(user.id) || 0) + heures);
      });
      
      // Convert to array with percentages
      const result: VentilationEmployeeRow[] = [];
      const processedEmployees = new Set<string>();
      
      // Group entries by employee
      const employeeEntries = new Map<string, VentilationEmployeeRow[]>();
      
      empChantierAgg.forEach((agg, key) => {
        const [salarieId, code] = key.split("___");
        const total = empTotals.get(salarieId) || 0;
        const pourcentage = total !== 0 ? (agg.heures / total) * 100 : 0;
        const typeMO = getTypeMO({ agence_interim: null, statut: agg.user.statut });
        
        const row: VentilationEmployeeRow = {
          salarieId,
          nom: agg.user.nom,
          prenom: agg.user.prenom,
          typeMO,
          codeAnalytique: code,
          libelle: formatLibelleChantier(code === "N/A" ? null : code),
          quantite: agg.heures,
          pourcentage
        };
        
        if (!employeeEntries.has(salarieId)) {
          employeeEntries.set(salarieId, []);
        }
        employeeEntries.get(salarieId)!.push(row);
      });
      
      // Sort and add totals
      const sortedEmployees = Array.from(employeeEntries.entries()).sort((a, b) => {
        const userA = a[1][0];
        const userB = b[1][0];
        return `${userA.nom} ${userA.prenom}`.localeCompare(`${userB.nom} ${userB.prenom}`);
      });
      
      sortedEmployees.forEach(([salarieId, rows]) => {
        // Sort rows by code
        rows.sort((a, b) => a.codeAnalytique.localeCompare(b.codeAnalytique));
        
        // Add rows
        result.push(...rows);
        
        // Add total row
        const total = empTotals.get(salarieId) || 0;
        result.push({
          salarieId,
          nom: rows[0].nom,
          prenom: rows[0].prenom,
          typeMO: rows[0].typeMO,
          codeAnalytique: "TOTAL",
          libelle: "",
          quantite: total,
          pourcentage: 100,
          isTotal: true
        });
      });
      
      return result;
    },
    enabled: !!periode && periode !== "all" && !!entrepriseId
  });
};

// Hook: Ventilation Intérim
export const useVentilationInterim = (periode: string) => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");
  
  return useQuery({
    queryKey: ["ventilation-interim", periode, entrepriseId],
    queryFn: async () => {
      if (!periode || periode === "all" || !entrepriseId) return [];
      
      const weeks = getWeeksInMonth(periode);
      if (weeks.length === 0) return [];
      
      // Fetch fiches for the period with valid statuses
      const { data: fichesData, error: fichesError } = await supabase
        .from("fiches")
        .select(`
          id,
          salarie_id,
          semaine,
          utilisateurs!fiches_salarie_id_fkey (
            id,
            nom,
            prenom,
            agence_interim,
            statut,
            entreprise_id
          )
        `)
        .in("semaine", weeks)
        .in("statut", ["ENVOYE_RH", "AUTO_VALIDE", "CLOTURE"]);
      
      if (fichesError) throw fichesError;
      if (!fichesData || fichesData.length === 0) return [];
      
      // Filter: entreprise + intérimaire uniquement
      const filteredFiches = fichesData.filter(f => 
        f.utilisateurs && 
        f.utilisateurs.entreprise_id === entrepriseId &&
        f.utilisateurs.agence_interim
      );
      
      if (filteredFiches.length === 0) return [];
      
      const ficheIds = filteredFiches.map(f => f.id);
      
      // Fetch fiches_jours
      const { data: joursData, error: joursError } = await supabase
        .from("fiches_jours")
        .select("fiche_id, code_chantier_du_jour, HNORM")
        .in("fiche_id", ficheIds);
      
      if (joursError) throw joursError;
      if (!joursData) return [];
      
      // Build maps
      const ficheUserMap = new Map<string, { id: string; nom: string; prenom: string; agence_interim: string }>();
      filteredFiches.forEach(f => {
        if (f.utilisateurs && f.utilisateurs.agence_interim) {
          ficheUserMap.set(f.id, {
            id: f.utilisateurs.id,
            nom: f.utilisateurs.nom || "",
            prenom: f.utilisateurs.prenom || "",
            agence_interim: f.utilisateurs.agence_interim
          });
        }
      });
      
      // Aggregate by (employee, chantier)
      const empChantierAgg = new Map<string, { heures: number; user: typeof ficheUserMap extends Map<string, infer V> ? V : never }>();
      const empTotals = new Map<string, number>();
      
      joursData.forEach(jour => {
        const user = ficheUserMap.get(jour.fiche_id);
        if (!user) return;
        
        const code = jour.code_chantier_du_jour || "N/A";
        const heures = jour.HNORM || 0;
        const key = `${user.id}___${code}`;
        
        if (!empChantierAgg.has(key)) {
          empChantierAgg.set(key, { heures: 0, user });
        }
        empChantierAgg.get(key)!.heures += heures;
        
        empTotals.set(user.id, (empTotals.get(user.id) || 0) + heures);
      });
      
      // Convert to array with percentages
      const result: VentilationEmployeeRow[] = [];
      
      // Group entries by employee
      const employeeEntries = new Map<string, VentilationEmployeeRow[]>();
      
      empChantierAgg.forEach((agg, key) => {
        const [salarieId, code] = key.split("___");
        const total = empTotals.get(salarieId) || 0;
        const pourcentage = total !== 0 ? (agg.heures / total) * 100 : 0;
        
        const row: VentilationEmployeeRow = {
          salarieId,
          nom: agg.user.nom,
          prenom: agg.user.prenom,
          agenceInterim: agg.user.agence_interim,
          typeMO: 'INTERIM',
          codeAnalytique: code,
          libelle: formatLibelleChantier(code === "N/A" ? null : code),
          quantite: agg.heures,
          pourcentage
        };
        
        if (!employeeEntries.has(salarieId)) {
          employeeEntries.set(salarieId, []);
        }
        employeeEntries.get(salarieId)!.push(row);
      });
      
      // Sort and add totals
      const sortedEmployees = Array.from(employeeEntries.entries()).sort((a, b) => {
        const userA = a[1][0];
        const userB = b[1][0];
        return `${userA.nom} ${userA.prenom}`.localeCompare(`${userB.nom} ${userB.prenom}`);
      });
      
      sortedEmployees.forEach(([salarieId, rows]) => {
        // Sort rows by code
        rows.sort((a, b) => a.codeAnalytique.localeCompare(b.codeAnalytique));
        
        // Add rows
        result.push(...rows);
        
        // Add total row
        const total = empTotals.get(salarieId) || 0;
        result.push({
          salarieId,
          nom: rows[0].nom,
          prenom: rows[0].prenom,
          agenceInterim: rows[0].agenceInterim,
          typeMO: 'INTERIM',
          codeAnalytique: "TOTAL",
          libelle: "",
          quantite: total,
          pourcentage: 100,
          isTotal: true
        });
      });
      
      return result;
    },
    enabled: !!periode && periode !== "all" && !!entrepriseId
  });
};
