

# Plan : Correction de l'erreur de signature conducteur (UUID invalide)

## Diagnostic confirmé

L'erreur `invalid input syntax for type uuid: "da638cc1-...-2026-S05"` est causée par l'utilisation d'un **ID composite** (chantier + semaine) au lieu d'un **UUID réel** lors de la signature d'une fiche simple.

**Localisation du bug :** `FicheDetail.tsx` lignes 745-752

```typescript
} else {
  // Si c'est une fiche simple, signer uniquement celle-ci
  await saveSignatureMutation.mutateAsync({
    ficheId: ficheId,  // ← BUG: ficheId = ID composite, pas un UUID
    ...
  });
}
```

---

## Analyse de non-régression

| Vérification | Statut | Détail |
|--------------|--------|--------|
| `allFiches` jamais vide | ✅ | Early return si `!ficheData` (ligne 128), et `allFiches` inclut toujours au moins `ficheData` lui-même |
| Cas multi-fiches inchangé | ✅ | La boucle `for (const fiche of allFiches)` utilise déjà `fiche.id` (UUID réel) |
| `SignatureMacons.tsx` | ✅ | Utilise `selectedMacon.ficheId` provenant de requête directe → UUID réel |
| `SignatureFinisseurs.tsx` | ✅ | Utilise `ficheFinisseur.id` provenant de requête directe → UUID réel |
| Hook `useSaveSignature` | ✅ | Aucune modification, mutation standard |
| RLS signatures | ✅ | Politique `true` temporaire, pas de restriction |
| Autres pages application | ✅ | Aucun autre composant n'utilise cette logique de signature conducteur |

---

## Modification à effectuer

### Fichier : `src/components/validation/FicheDetail.tsx`

**Lignes 745-752 - Avant :**
```typescript
} else {
  // Si c'est une fiche simple, signer uniquement celle-ci
  await saveSignatureMutation.mutateAsync({
    ficheId: ficheId,
    userId: conducteurId,
    role: "conducteur",
    signatureData,
  });
}
```

**Après :**
```typescript
} else {
  // Si c'est une fiche simple, utiliser l'UUID réel depuis allFiches
  const realFicheId = allFiches[0]?.id;
  if (!realFicheId) {
    throw new Error("Impossible de récupérer l'ID réel de la fiche");
  }
  await saveSignatureMutation.mutateAsync({
    ficheId: realFicheId,
    userId: conducteurId,
    role: "conducteur",
    signatureData,
  });
}
```

---

## Pourquoi `allFiches[0]?.id` est garanti valide

```text
┌─────────────────────────────────────────────────────────────┐
│  Flux d'exécution dans FicheDetail.tsx                      │
├─────────────────────────────────────────────────────────────┤
│  1. useFicheDetailWithJours(ficheId) → ficheData            │
│     ↓                                                        │
│  2. if (!ficheData) → return "Fiche introuvable" (ligne 128)│
│     ↓                                                        │
│  3. allFiches = ficheData.all_fiches (contient 1+ fiches)   │
│     ↓                                                        │
│  4. SignaturePad visible seulement si ficheData existe      │
│     ↓                                                        │
│  5. allFiches[0].id = UUID réel depuis table `fiches`       │
└─────────────────────────────────────────────────────────────┘
```

---

## Résultat attendu

Après ce fix :
1. Le conducteur peut signer les fiches individuelles et composites
2. La fiche passe au statut `ENVOYE_RH`
3. Le service RH voit la fiche dans sa liste de validation
4. Aucun impact sur les autres pages (SignatureMacons, SignatureFinisseurs, etc.)

---

## Section technique

**Tables impliquées :**
- `signatures` : insertion avec `fiche_id` (UUID), `signed_by`, `role`, `signature_data`
- `fiches` : mise à jour du `statut` vers `ENVOYE_RH`

**Hooks impliqués :**
- `useSaveSignature` : mutation d'insertion signature (inchangé)
- `useUpdateFicheStatus` : mise à jour statut (inchangé)
- `useFicheDetailWithJours` : source de `allFiches` avec UUIDs réels

