

## Fix : blocage multi-chantier dans useSaveFiche et useFicheModifiable

### Problème
Quand un salarié (ex: Aouel) a une fiche `ENVOYE_RH` sur un chantier (NUANCE) et une fiche `BROUILLON` sur un autre (CHEVIGNY), la sauvegarde/transmission peut échouer si le `chantierId` n'est pas résolu (cache périmé, affectations non chargées). La requête remonte alors la fiche NUANCE au lieu de CHEVIGNY → erreur bloquante.

### Corrections (2 fichiers)

#### 1. `src/hooks/useSaveFiche.ts`
**Lignes 88-102** — Rendre la logique de blocage plus robuste :
- Actuellement : skip seulement si `chantierId` est fourni ET `existingFiche.chantier_id` diffère
- Après fix : **toujours comparer** le `chantier_id` de la fiche trouvée avec le `chantierId` demandé. Si la fiche bloquante est sur un chantier différent de celui qu'on essaie de sauvegarder → skip (return null) au lieu de throw
- Si la fiche bloquante est sur le MÊME chantier → throw comme avant (aucun changement de comportement)

#### 2. `src/hooks/useFicheModifiable.ts`
**Lignes 34-45** — Scoper la vérification par chantier :
- Actuellement : filtre `chantier_id` conditionnel, ce qui peut remonter les fiches d'autres chantiers
- Après fix : quand `chantierId` est fourni, appliquer systématiquement `.eq("chantier_id", chantierId)` pour ne vérifier que les fiches du chantier concerné
- Sans `chantierId` : comportement inchangé

### Vérification régression
- **Côté conducteur** : `ValidationConducteur.handleSaveAndSign` et `useSaveChantierManuel` passent toujours un `chantierId`. Si le chantier est correct et la fiche est bloquée sur CE chantier → throw inchangé. Si bloquée sur un AUTRE → skip au lieu de crash.
- **Côté chef** : `Index.tsx` passe toujours `selectedChantier` à `useFicheModifiable`. Le filtre devient plus strict (ne regarde QUE ce chantier), ce qui est le comportement attendu.
- **Signatures** : `SignatureMacons` et `SignatureFinisseurs` n'utilisent PAS ces hooks → aucun impact.
- **RH** : `ConsultationRH` et `FicheDetail` n'utilisent PAS `useSaveFiche` ni `useFicheModifiable` → aucun impact.

