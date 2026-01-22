

# Plan de correction : Aligner le flux Conducteur/Finisseurs sur le flux Chef/Maçons

## Constat

Les logiques d'initialisation des trajets (`code_trajet = "A_COMPLETER"`) et des codes chantier (`code_chantier_du_jour`) sont correctement implémentées pour le flux **Chef/Maçons** mais ne sont **pas appliquées** au flux **Conducteur/Finisseurs**.

| Comportement | Chef/Maçons | Conducteur/Finisseurs |
|--------------|-------------|----------------------|
| `code_trajet` default | `"A_COMPLETER"` | `null` |
| `code_chantier_du_jour` | Enrichi depuis chantier | Dépend de `ficheJours` existant |

---

## Fichiers à modifier

### 1. `src/components/timesheet/TimeEntryTable.tsx`

**Ligne 482** - Fallback `A_COMPLETER` au chargement :
```
// AVANT
codeTrajet: ((j as any).code_trajet || null) as CodeTrajet | null,

// APRÈS  
codeTrajet: ((j as any).code_trajet || (trajet ? "A_COMPLETER" : null)) as CodeTrajet | null,
```

**Ligne 502** - Enrichir chantier même si `chantierId` existe mais pas le code :
```
// AVANT
if (!currentDay.chantierId && !currentDay.chantierCode) {

// APRÈS
if (!currentDay.chantierCode) {
```

---

### 2. `src/pages/ValidationConducteur.tsx`

**Ligne 322** - Fallback `A_COMPLETER` à la transmission :
```
// AVANT
code_trajet: dayData.codeTrajet || null,

// APRÈS
code_trajet: dayData.codeTrajet || (dayData.trajet ? "A_COMPLETER" : null),
```

---

## Résumé des modifications

| Fichier | Ligne | Modification |
|---------|-------|--------------|
| `TimeEntryTable.tsx` | 482 | `codeTrajet` fallback `A_COMPLETER` si `trajet=true` |
| `TimeEntryTable.tsx` | 502 | Condition simplifiée pour enrichir le code chantier |
| `ValidationConducteur.tsx` | 322 | `code_trajet` fallback `A_COMPLETER` si `trajet=true` |

---

## Comportement attendu après correction

1. **Trajet coché** → `code_trajet = "A_COMPLETER"` → RH peut compléter (T1, T2, GD...)
2. **Chantier depuis planning** → `code_chantier_du_jour` et `ville_du_jour` toujours remplis
3. **Vue RH "Consolidé par salarié"** → Colonnes "Trajets" et "Chantier" affichent les bonnes valeurs

---

## Test de validation

1. Purger les données SDER (si nécessaire)
2. **Planning** : Affecter DARCOURT et KASMI au chantier TEST, semaine S05
3. **Valider le planning** + Sync S+1
4. **Espace Conducteur → Mes heures** : Vérifier les cases Trajet et Panier cochées
5. **Collecter les signatures** → Signer
6. **Consultation RH → Consolidé par salarié** :
   - Colonne "Trajets" = nombre de jours affectés (ex: 5)
   - Colonne "Chantier" = code du chantier (ex: "TEST" ou "CI...")

