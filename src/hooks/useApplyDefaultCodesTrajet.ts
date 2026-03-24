import { supabase } from "@/integrations/supabase/client";

interface FicheForCodesTrajet {
  id: string;
  salarie_id: string | null;
  chantier_id: string | null;
}

/**
 * Auto-remplit les codes trajet "A_COMPLETER" avec les valeurs
 * configurées dans codes_trajet_defaut lors de la transmission RH.
 *
 * Ne throw JAMAIS — les erreurs sont loguées et ignorées
 * pour ne pas bloquer la transmission.
 */
export async function applyDefaultCodesTrajet(
  fiches: FicheForCodesTrajet[]
): Promise<void> {
  try {
    if (!fiches || fiches.length === 0) return;

    const entrepriseId = localStorage.getItem("current_entreprise_id");
    if (!entrepriseId) {
      console.warn("[applyDefaultCodesTrajet] Pas d'entreprise_id");
      return;
    }

    const ficheIds = fiches.map((f) => f.id);
    const salarieIds = [
      ...new Set(fiches.map((f) => f.salarie_id).filter(Boolean)),
    ] as string[];

    if (salarieIds.length === 0) return;

    // Construire un lookup fiche_id → chantier_id (fallback)
    const ficheChantierMap = new Map<string, string>();
    for (const f of fiches) {
      if (f.chantier_id) ficheChantierMap.set(f.id, f.chantier_id);
    }

    // ── 1. Charger les fiches_jours éligibles ──────────────────────
    // On doit récupérer aussi le fiche_id pour le fallback chantier
    const eligibleJours: {
      id: string;
      fiche_id: string;
      code_chantier_du_jour: string | null;
    }[] = [];

    // Batch par 100 fiche IDs pour éviter les URL trop longues
    const CHUNK = 100;
    for (let i = 0; i < ficheIds.length; i += CHUNK) {
      const chunk = ficheIds.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from("fiches_jours")
        .select("id, fiche_id, code_chantier_du_jour")
        .in("fiche_id", chunk)
        .eq("code_trajet", "A_COMPLETER")
        .or("trajet_perso.is.null,trajet_perso.eq.false");

      if (error) {
        console.error("[applyDefaultCodesTrajet] Erreur chargement fiches_jours:", error);
        return;
      }
      if (data) eligibleJours.push(...data);
    }

    if (eligibleJours.length === 0) {
      console.log("[applyDefaultCodesTrajet] Aucun jour A_COMPLETER trouvé");
      return;
    }

    console.log(
      `[applyDefaultCodesTrajet] ${eligibleJours.length} jours A_COMPLETER à traiter`
    );

    // ── 2. Résoudre les code_chantier_du_jour → chantier UUID ──────
    const uniqueCodes = [
      ...new Set(
        eligibleJours
          .map((j) => j.code_chantier_du_jour)
          .filter((c): c is string => !!c && c.trim() !== "")
      ),
    ];

    const codeToChantierIdMap = new Map<string, string>();

    if (uniqueCodes.length > 0) {
      for (let i = 0; i < uniqueCodes.length; i += CHUNK) {
        const chunk = uniqueCodes.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from("chantiers")
          .select("id, code_chantier")
          .eq("entreprise_id", entrepriseId)
          .in("code_chantier", chunk);

        if (error) {
          console.error("[applyDefaultCodesTrajet] Erreur résolution chantiers:", error);
          // On continue avec le fallback fiche.chantier_id
        }
        if (data) {
          for (const c of data) {
            if (c.code_chantier) {
              codeToChantierIdMap.set(c.code_chantier, c.id);
            }
          }
        }
      }
    }

    // ── 3. Charger les codes_trajet_defaut pertinents ──────────────
    const defaultCodesMap = new Map<string, string>(); // "chantierId_salarieId" → code_trajet

    for (let i = 0; i < salarieIds.length; i += CHUNK) {
      const chunk = salarieIds.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from("codes_trajet_defaut" as any)
        .select("chantier_id, salarie_id, code_trajet")
        .eq("entreprise_id", entrepriseId)
        .in("salarie_id", chunk);

      if (error) {
        console.error("[applyDefaultCodesTrajet] Erreur chargement codes_trajet_defaut:", error);
        return;
      }
      if (data) {
        for (const row of data as any[]) {
          defaultCodesMap.set(
            `${row.chantier_id}_${row.salarie_id}`,
            row.code_trajet
          );
        }
      }
    }

    if (defaultCodesMap.size === 0) {
      console.log("[applyDefaultCodesTrajet] Aucun mapping codes_trajet_defaut trouvé");
      return;
    }

    // ── 4. Construire un lookup fiche_id → salarie_id ──────────────
    const ficheSalarieMap = new Map<string, string>();
    for (const f of fiches) {
      if (f.salarie_id) ficheSalarieMap.set(f.id, f.salarie_id);
    }

    // ── 5. Résoudre chaque jour et préparer les updates ────────────
    // Grouper par code_trajet cible pour minimiser les requêtes update
    const updatesByCode = new Map<string | null, string[]>(); // code → [ficheJourId, ...]

    for (const jour of eligibleJours) {
      const salarieId = ficheSalarieMap.get(jour.fiche_id);
      if (!salarieId) continue;

      // Résoudre le chantier_id effectif pour ce jour
      let chantierId: string | undefined;
      if (jour.code_chantier_du_jour && jour.code_chantier_du_jour.trim() !== "") {
        chantierId = codeToChantierIdMap.get(jour.code_chantier_du_jour);
      }
      // Fallback sur le chantier de la fiche parente
      if (!chantierId) {
        chantierId = ficheChantierMap.get(jour.fiche_id);
      }
      if (!chantierId) continue;

      // Lookup dans la map des codes par défaut
      const key = `${chantierId}_${salarieId}`;
      const defaultCode = defaultCodesMap.get(key);

      if (defaultCode === undefined) {
        // Pas de mapping configuré → laisser "A_COMPLETER"
        continue;
      }

      if (defaultCode === "AUCUN") {
        // "AUCUN" = volontairement pas de trajet → null
        const group = updatesByCode.get(null) || [];
        group.push(jour.id);
        updatesByCode.set(null, group);
      } else {
        // Code trajet valide
        const group = updatesByCode.get(defaultCode) || [];
        group.push(jour.id);
        updatesByCode.set(defaultCode, group);
      }
    }

    // ── 6. Exécuter les updates en batch ───────────────────────────
    let totalUpdated = 0;
    const UPDATE_CHUNK = 50;

    for (const [codeTrajet, jourIds] of updatesByCode.entries()) {
      for (let i = 0; i < jourIds.length; i += UPDATE_CHUNK) {
        const chunk = jourIds.slice(i, i + UPDATE_CHUNK);
        const { error } = await supabase
          .from("fiches_jours")
          .update({
            code_trajet: codeTrajet,
            updated_at: new Date().toISOString(),
          })
          .in("id", chunk);

        if (error) {
          console.error(
            `[applyDefaultCodesTrajet] Erreur update batch (code=${codeTrajet}):`,
            error
          );
          // Continuer avec les autres groupes
        } else {
          totalUpdated += chunk.length;
        }
      }
    }

    console.log(
      `[applyDefaultCodesTrajet] ✓ ${totalUpdated}/${eligibleJours.length} jours mis à jour`
    );
  } catch (err) {
    // Ne JAMAIS bloquer la transmission
    console.error("[applyDefaultCodesTrajet] Erreur inattendue (ignorée):", err);
  }
}
