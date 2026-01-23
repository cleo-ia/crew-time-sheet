
# Correction : Chef bloqué sur la signature (MAILLARD S04)

## Diagnostic

Le chef Sébastien BOUILLET voit 0h au lieu de 39h sur sa fiche MAILLARD S04 et ne peut pas signer car :

1. **Code non publié** : Les corrections du 22 janvier 2026 sur `useMaconsByChantier.ts` (ajout du filtre `chantier_id`) ne sont pas en PROD
2. **L'ancienne version** du code en PROD ne récupère pas correctement la fiche quand un employé travaille sur plusieurs chantiers
3. **Echec silencieux** : `handleSaveSignature` fait un `return` sans message quand `ficheId` est undefined

## Données en base (correctes)

| Chantier | Fiche ID | Heures | Jours |
|----------|----------|--------|-------|
| MAILLARD | d8e60721-3786-4ebf-af4c-b9a5fafeeb47 | 39h | 5 |
| DAVOULT | d78983ad-bbb1-4c0e-8dec-ac729b81b2e7 | 39h | 5 |

Les données existent et sont correctes. Le problème est purement côté code frontend en production.

## Solution en 2 parties

### Partie 1 : Publication immediate (resout le probleme)

Publier le code pour que le chef ait acces aux corrections du hook `useMaconsByChantier`.

Le code actuel contient deja les bons filtres (ligne 93):
```typescript
const { data: fichChef } = await supabase
  .from("fiches")
  .select("id, total_heures")
  .eq("salarie_id", chef.id)
  .eq("chantier_id", chantierId)  // Ce filtre manquait en PROD
  .eq("semaine", semaine)
  .maybeSingle();
```

### Partie 2 : Feedback utilisateur (robustesse)

Modifier `src/pages/SignatureMacons.tsx` pour afficher des messages d'erreur explicites au lieu d'echouer silencieusement.

**Modification dans `handleSaveSignature` (lignes 114-137):**

```typescript
const handleSaveSignature = async (signatureData: string) => {
  // Ajouter un feedback si aucun employe selectionne
  if (!selectedMacon) {
    toast({
      variant: "destructive",
      title: "Erreur",
      description: "Aucun employe selectionne",
    });
    return;
  }
  
  // Ajouter un feedback si pas de fiche
  if (!selectedMacon.ficheId) {
    toast({
      variant: "destructive", 
      title: "Fiche introuvable",
      description: "La fiche de pointage n'existe pas pour cet employe. Essayez de rafraichir la page.",
    });
    return;
  }

  try {
    await saveSignature.mutateAsync({
      ficheId: selectedMacon.ficheId,
      userId: selectedMacon.id,
      role: selectedMacon.isChef ? "chef" : undefined,
      signatureData,
    });
    // ... reste du code inchange
```

## Fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/SignatureMacons.tsx` | Ajouter toasts d'erreur explicites dans `handleSaveSignature` |

## Impact

- **Resolution immediate** : La publication deploie les corrections existantes
- **Meilleur feedback** : Les erreurs futures seront visibles au lieu d'etre silencieuses
- **Aucune regression** : Les utilisateurs avec une seule fiche ne sont pas impactes

## Instructions pour le chef

Apres la publication, demander au chef Sebastien BOUILLET de :
1. Rafraichir completement la page (Ctrl+Shift+R ou vider le cache)
2. Retourner sur la page de signature pour MAILLARD S04
3. Ses heures (39h, 5 paniers, 5 trajets) devraient maintenant s'afficher
4. La signature et validation fonctionneront normalement
