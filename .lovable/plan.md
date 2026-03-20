

## Stocker "AUCUN" comme vraie valeur en base

### Modifications

**Fichier 1 : `src/hooks/useCodesTrajetDefaut.ts`** (lignes 85-95 et 104)
- Supprimer le bloc `if (!codeTrajet) { delete... }` (lignes 85-95)
- Remplacer par : `const finalCode = codeTrajet ?? "AUCUN";`
- Ligne 104 : changer `code_trajet: codeTrajet` → `code_trajet: finalCode`

**Fichier 2 : `src/pages/CodesTrajet.tsx`** (ligne 104)
- Changer `codeTrajet: value === "AUCUN" ? null : value` → `codeTrajet: value`
- "AUCUN" est envoyé tel quel au mutation, qui le stocke en base

### Résultat
- Sélectionner "Aucun" crée une ligne avec `code_trajet = "AUCUN"` au lieu de supprimer la ligne
- Le compteur (ex: 0/73 → 73/73) comptera correctement les employés configurés
- Aucun changement de schéma DB nécessaire (le champ `code_trajet text NOT NULL` accepte déjà la valeur "AUCUN")

