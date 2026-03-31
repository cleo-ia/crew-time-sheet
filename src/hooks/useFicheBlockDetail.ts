import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMemberStatus {
  salarieId: string;
  nom: string;
  prenom: string;
  roleMetier: string | null;
  statut: string | null; // null = pas de fiche
  jours: string[]; // dates d'affectation sur ce chantier
}

export interface FicheBlockDetail {
  chefId: string | null;
  chefNom: string;
  chefEmail: string | null;
  conducteurId: string | null;
  conducteurNom: string;
  conducteurEmail: string | null;
  chantierNom: string;
  chantierId: string;
  diagnostic: "bloque_chef" | "bloque_conducteur" | "mixte" | "inconnu";
  diagnosticLabel: string;
  team: TeamMemberStatus[];
}

export const useFicheBlockDetail = (salarieId: string | null, semaine: string | null) => {
  return useQuery<FicheBlockDetail[]>({
    queryKey: ["fiche-block-detail", salarieId, semaine],
    enabled: !!salarieId && !!semaine,
    queryFn: async () => {
      if (!salarieId || !semaine) return [];

      // 1. Find ALL fiches for this salarié + semaine
      const { data: fiches } = await supabase
        .from("fiches")
        .select("chantier_id, statut")
        .eq("salarie_id", salarieId)
        .eq("semaine", semaine);

      if (!fiches || fiches.length === 0) return [];

      // Get unique chantier IDs
      const chantierIds = [...new Set(fiches.filter(f => f.chantier_id).map(f => f.chantier_id!))];
      if (chantierIds.length === 0) return [];

      // 2. Get all chantiers info
      const { data: chantiers } = await supabase
        .from("chantiers")
        .select("id, nom, chef_id, conducteur_id")
        .in("id", chantierIds);

      if (!chantiers) return [];

      // 3. Get all affectations for these chantiers + semaine
      const { data: allAffectations } = await supabase
        .from("affectations_jours_chef")
        .select("chef_id, macon_id, chantier_id, jour")
        .in("chantier_id", chantierIds)
        .eq("semaine", semaine);

      // Collect ALL user IDs we need to fetch
      const allUserIds = new Set<string>();
      allUserIds.add(salarieId);
      chantiers.forEach(c => {
        if (c.chef_id) allUserIds.add(c.chef_id);
        if (c.conducteur_id) allUserIds.add(c.conducteur_id);
      });
      allAffectations?.forEach(a => {
        allUserIds.add(a.macon_id);
        allUserIds.add(a.chef_id);
      });

      // 4. Batch fetch all users (names + roles)
      const { data: users } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom, role_metier, email")
        .in("id", Array.from(allUserIds));

      const usersMap = new Map(users?.map(u => [u.id, u]) || []);

      // 5. Get all fiches for team members across these chantiers
      const teamMemberIds = new Set<string>();
      chantierIds.forEach(cid => {
        allAffectations?.filter(a => a.chantier_id === cid).forEach(a => teamMemberIds.add(a.macon_id));
      });
      teamMemberIds.add(salarieId);

      const { data: teamFiches } = await supabase
        .from("fiches")
        .select("salarie_id, statut, chantier_id")
        .in("salarie_id", Array.from(teamMemberIds))
        .eq("semaine", semaine)
        .in("chantier_id", chantierIds);

      // Group fiches by chantier_id + salarie_id
      const fichesByChantierMember = new Map<string, string>();
      teamFiches?.forEach(f => {
        if (f.salarie_id && f.chantier_id) {
          fichesByChantierMember.set(`${f.chantier_id}:${f.salarie_id}`, f.statut);
        }
      });

      // 6. Build one block per chantier
      const ROLE_ORDER: Record<string, number> = { chef: 0, macon: 1, finisseur: 2, grutier: 3 };

      const blocks: FicheBlockDetail[] = chantiers.map(chantier => {
        const chefId = allAffectations?.find(a => a.chantier_id === chantier.id)?.chef_id || chantier.chef_id || null;
        const conducteurId = chantier.conducteur_id || null;

        // Team for this chantier
        const chantierTeamIds = new Set<string>();
        allAffectations?.filter(a => a.chantier_id === chantier.id).forEach(a => chantierTeamIds.add(a.macon_id));
        // Include the salarié themselves if they have a fiche on this chantier
        if (fiches.some(f => f.chantier_id === chantier.id)) {
          chantierTeamIds.add(salarieId);
        }

        const team: TeamMemberStatus[] = Array.from(chantierTeamIds).map(id => {
          const user = usersMap.get(id);
          return {
            salarieId: id,
            nom: user?.nom || "—",
            prenom: user?.prenom || "",
            roleMetier: user?.role_metier || null,
            statut: fichesByChantierMember.get(`${chantier.id}:${id}`) || null,
          };
        });

        team.sort((a, b) => {
          const ra = ROLE_ORDER[a.roleMetier || ""] ?? 4;
          const rb = ROLE_ORDER[b.roleMetier || ""] ?? 4;
          if (ra !== rb) return ra - rb;
          return a.nom.localeCompare(b.nom);
        });

        // Diagnostic
        const statuts = team.map(t => t.statut);
        const hasValideChef = statuts.some(s => s === "VALIDE_CHEF");
        const allPreChef = statuts.every(s => !s || s === "BROUILLON" || s === "EN_SIGNATURE");

        let diagnostic: FicheBlockDetail["diagnostic"];
        let diagnosticLabel: string;

        if (!chefId) {
          diagnostic = "bloque_conducteur";
          diagnosticLabel = "Bloqué côté conducteur — en attente de transmission";
        } else if (allPreChef) {
          diagnostic = "bloque_chef";
          diagnosticLabel = "Bloqué côté chef — le chef n'a pas encore transmis";
        } else if (hasValideChef) {
          diagnostic = "bloque_conducteur";
          diagnosticLabel = "Bloqué côté conducteur — en attente de validation";
        } else {
          diagnostic = "mixte";
          diagnosticLabel = "Statuts mixtes dans l'équipe";
        }

        const chefUser = chefId ? usersMap.get(chefId) : null;
        const conducteurUser = conducteurId ? usersMap.get(conducteurId) : null;

        return {
          chefId,
          chefNom: chefUser ? `${chefUser.prenom} ${chefUser.nom}` : "—",
          chefEmail: chefUser?.email || null,
          conducteurId,
          conducteurNom: conducteurUser ? `${conducteurUser.prenom} ${conducteurUser.nom}` : "—",
          conducteurEmail: conducteurUser?.email || null,
          chantierNom: chantier.nom || "—",
          chantierId: chantier.id,
          diagnostic,
          diagnosticLabel,
          team,
        };
      });

      return blocks;
    },
  });
};
