
# Plan : Activation de l'auto-save pour les conducteurs

## Résumé de la modification

Activer l'auto-save debounced (1 seconde) pour les conducteurs dans `TimeEntryTable.tsx`, afin que les modifications soient automatiquement sauvegardées en arrière-plan, comme c'est déjà le cas pour les chefs.

---

## Garanties d'absence d'impact négatif

### Base de données
- **Pas de duplication** : L'upsert avec `onConflict: 'fiche_id,date'` garantit qu'une même entrée ne peut pas être créée deux fois
- **Pas de corruption** : La logique existante dans `useAutoSaveFiche` supporte déjà `mode: "conducteur"` et utilise correctement `affectations_finisseurs_jours`
- **Pas d'heures fantômes** : Le hook vérifie les affectations avant de sauvegarder

### Frontend
- **Pas d'impact sur les chefs** : La condition `isConducteurMode` est utilisée pour router vers le bon mode, pas pour changer la logique fondamentale
- **Pas de conflit avec le bouton manuel** : "Enregistrer ce chantier" utilise `useSaveFiche` (hook différent de `useAutoSaveFiche`)
- **Comportement identique aux chefs** : Même debounce de 1 seconde, même sauvegarde silencieuse

### Autres modules
- **Validation des fiches** : Non affecté (lecture seule)
- **Signatures** : Non affecté (processus séparé)
- **RH** : Non affecté (consomme les données sauvegardées)

---

## Modifications techniques

### Fichier : `src/components/timesheet/TimeEntryTable.tsx`

#### 1. Auto-save debounced (lignes ~943-968)

```text
AVANT (ligne 945) :
if (isConducteurMode) return;

APRÈS :
(supprimer cette ligne - les conducteurs bénéficieront de l'auto-save)
```

```text
AVANT (ligne 957) :
mode: "chef"

APRÈS :
mode: isConducteurMode ? "conducteur" : "chef"
```

#### 2. Sauvegarde sur fermeture de page (lignes ~972-997)

```text
AVANT (ligne 974) :
if (isConducteurMode) return;

APRÈS :
(supprimer cette ligne)
```

```text
AVANT (ligne 984) :
mode: "chef"

APRÈS :
mode: isConducteurMode ? "conducteur" : "chef"
```

---

## Test de validation

1. Aller sur `/validation-conducteur?tab=mes-heures` avec une équipe de finisseurs
2. Modifier les heures d'un finisseur (ex: 8h → 6h)
3. Attendre 2 secondes (debounce 1s + sauvegarde)
4. Changer d'onglet vers "Validation des fiches"
5. Revenir sur "Mes heures" → **les modifications sont conservées**
6. Rafraîchir la page (F5) → **les modifications sont toujours présentes**
7. Vérifier que le bouton "Enregistrer ce chantier" fonctionne toujours normalement

---

## Résumé

| Élément | Impact |
|---------|--------|
| Chefs | ✅ Aucun changement |
| Conducteurs | ✅ Auto-save activé (identique aux chefs) |
| Base de données | ✅ Pas de duplication ni corruption |
| Bouton "Enregistrer" | ✅ Toujours fonctionnel |
| Performance | ✅ Inchangée (même debounce 1s) |
