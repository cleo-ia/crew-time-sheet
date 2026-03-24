import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMemberStatus {
  salarieId: string;
  nom: string;
  prenom: string;
  roleMetier: string | null;
  statut: string | null; // null = pas de fiche
}

export interface FicheBlockDetail {
  chefId: string | null;
  chefNom: string;
  conducteurId: string | null;
  conducteurNom: string;
  chantierNom: string;
  diagnostic: "bloque_chef" | "bloque_conducteur" | "mixte" | "inconnu";
  diagnosticLabel: string;
  team: TeamMemberStatus[];
}

export const useFicheBlockDetail = (salarieId: string | null, semaine: string | null) => {
  return useQuery<FicheBlockDetail | null>({
    queryKey: ["fiche-block-detail", salarieId, semaine],
    enabled: !!salarieId && !!semaine,
    queryFn: async () => {
      if (!salarieId || !semaine) return null;

      // 1. Find the fiche for this salarié + semaine to get chantier_id
      const { data: fiche } = await supabase
        .from("fiches")
        .select("chantier_id, statut")
        .eq("salarie_id", salarieId)
        .eq("semaine", semaine)
        .limit(1)
        .maybeSingle();

      const chantierId = fiche?.chantier_id;
      if (!chantierId) return null;

      // 2. Get chantier info (nom, chef, conducteur)
      const { data: chantier } = await supabase
        .from("chantiers")
        .select("nom, chef_id, conducteur_id")
        .eq("id", chantierId)
        .maybeSingle();

      // 3. Find chef via affectations_jours_chef for this chantier/semaine
      const { data: affectations } = await supabase
        .from("affectations_jours_chef")
        .select("chef_id, macon_id")
        .eq("chantier_id", chantierId)
        .eq("semaine", semaine);

      const chefId = affectations?.[0]?.chef_id || chantier?.chef_id || null;
      const conducteurId = chantier?.conducteur_id || null;

      // Collect all team members (unique macon_ids from affectations + the chef)
      const teamIds = new Set<string>();
      affectations?.forEach((a) => teamIds.add(a.macon_id));
      // Also include the original salarié
      teamIds.add(salarieId);

      if (teamIds.size === 0) return null;

      // 4. Get fiches for all team members for this semaine + chantier
      const { data: teamFiches } = await supabase
        .from("fiches")
        .select("salarie_id, statut")
        .in("salarie_id", Array.from(teamIds))
        .eq("semaine", semaine)
        .eq("chantier_id", chantierId);

      const fichesByMember = new Map<string, string>();
      teamFiches?.forEach((f) => {
        if (f.salarie_id) fichesByMember.set(f.salarie_id, f.statut);
      });

      // 5. Fetch names for all involved people
      const allIds = new Set(teamIds);
      if (chefId) allIds.add(chefId);
      if (conducteurId) allIds.add(conducteurId);

      const { data: users } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom, role_metier")
        .in("id", Array.from(allIds));

      const usersMap = new Map(users?.map((u) => [u.id, u]) || []);

      const chefUser = chefId ? usersMap.get(chefId) : null;
      const conducteurUser = conducteurId ? usersMap.get(conducteurId) : null;

      // 6. Build team list
      const team: TeamMemberStatus[] = Array.from(teamIds).map((id) => {
        const user = usersMap.get(id);
        return {
          salarieId: id,
          nom: user?.nom || "—",
          prenom: user?.prenom || "",
          roleMetier: user?.role_metier || null,
          statut: fichesByMember.get(id) || null,
        };
      });

      // Sort: by role then alpha
      const ROLE_ORDER: Record<string, number> = { chef: 0, macon: 1, finisseur: 2, grutier: 3 };
      team.sort((a, b) => {
        const ra = ROLE_ORDER[a.roleMetier || ""] ?? 4;
        const rb = ROLE_ORDER[b.roleMetier || ""] ?? 4;
        if (ra !== rb) return ra - rb;
        return a.nom.localeCompare(b.nom);
      });

      // 7. Diagnostic
      const statuts = team.map((t) => t.statut);
      const hasValideChef = statuts.some((s) => s === "VALIDE_CHEF");
      const allPreChef = statuts.every((s) => !s || s === "BROUILLON" || s === "EN_SIGNATURE");

      let diagnostic: FicheBlockDetail["diagnostic"];
      let diagnosticLabel: string;

      if (allPreChef) {
        diagnostic = "bloque_chef";
        diagnosticLabel = "Bloqué côté chef — le chef n'a pas encore transmis";
      } else if (hasValideChef) {
        diagnostic = "bloque_conducteur";
        diagnosticLabel = "Bloqué côté conducteur — en attente de validation";
      } else {
        diagnostic = "mixte";
        diagnosticLabel = "Statuts mixtes dans l'équipe";
      }

      return {
        chefId,
        chefNom: chefUser ? `${chefUser.prenom} ${chefUser.nom}` : "—",
        conducteurId,
        conducteurNom: conducteurUser ? `${conducteurUser.prenom} ${conducteurUser.nom}` : "—",
        chantierNom: chantier?.nom || "—",
        diagnostic,
        diagnosticLabel,
        team,
      };
    },
  });
};
