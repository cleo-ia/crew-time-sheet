
# Plan : Éliminer les doublons d'heures du chef à la source (sync-planning-to-teams)

## Contexte du problème

Lorsqu'un chef multi-chantiers est affecté à plusieurs sites (ex: CI229BALME + CI230ROSEYRAN), le système actuel :

1. **Crée des affectations planning** sur les deux sites (5 jours chacun) ✅ Normal
2. **Skip la création de fiches** pour le chef sur ses chantiers secondaires (lignes 467-498 du sync) ✅ OK
3. **MAIS** ne supprime pas les `fiches` et `fiches_jours` préexistants du chef sur ses chantiers secondaires ❌ **Problème**

**Résultat :** Philippe DURAND avait 40h sur BALME (principal) + 39h sur ROSEYRAN (secondaire) = 79h en BDD alors que seules les 40h du principal comptent.

La déduplication RH (par statut de fiche) protège en aval, mais c'est une "béquille" fragile — si les deux fiches atteignent le même statut, le système ne sait plus laquelle choisir.

---

## Solution proposée

Modifier l'Edge Function `sync-planning-to-teams` pour **nettoyer activement** les heures du chef sur ses chantiers secondaires.

### Logique à ajouter (après le bloc "skip fiche personnelle" ligne 497)

```text
SI c'est un chef sur un chantier SECONDAIRE
  1. Récupérer la fiche existante du chef sur CE chantier secondaire
  2. Si une fiche existe :
     - Supprimer tous les fiches_jours associés
     - Mettre total_heures = 0 dans la fiche
     - (NE PAS supprimer la fiche elle-même pour éviter les orphelins)
  3. Log "Chef [nom] sur chantier secondaire [code] : heures forcées à 0"
```

---

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/sync-planning-to-teams/index.ts` | Ajouter logique de nettoyage des fiches_jours du chef sur chantiers secondaires |

---

## Détails techniques

### Modification dans `sync-planning-to-teams` (lignes 467-498)

Après le bloc `continue` qui skip la création de fiche, ajouter :

```typescript
// NOUVEAU : Nettoyer les heures existantes du chef sur ce chantier secondaire
// Pour éviter les doublons RH si une fiche a été créée avant
const { data: ficheSecondaire } = await supabase
  .from('fiches')
  .select('id')
  .eq('salarie_id', employeId)
  .eq('chantier_id', chantierId)
  .eq('semaine', currentWeek)
  .maybeSingle()

if (ficheSecondaire) {
  // Supprimer les fiches_jours pour forcer 0h
  await supabase
    .from('fiches_jours')
    .delete()
    .eq('fiche_id', ficheSecondaire.id)
  
  // Mettre à jour total_heures à 0
  await supabase
    .from('fiches')
    .update({ total_heures: 0 })
    .eq('id', ficheSecondaire.id)
  
  console.log(`[sync-planning-to-teams] Chef ${employeNom} sur secondaire ${chantierId}: heures forcées à 0`)
}
```

---

## Garanties anti-régression

| Scénario | Avant | Après | Impact |
|----------|-------|-------|--------|
| Chef sur chantier principal | Fiche créée avec heures | Inchangé | ✅ Aucun |
| Chef sur chantier secondaire | Fiche potentiellement pré-remplie avec 39h | Fiche vidée (0h) | ✅ Correction |
| Maçon sur n'importe quel chantier | Fiche créée normalement | Inchangé | ✅ Aucun |
| Finisseur sur n'importe quel chantier | Fiche créée normalement | Inchangé | ✅ Aucun |
| Chef sans chantier principal défini | Fiche créée sur tous chantiers | Inchangé (pas de secondaire détecté) | ✅ Aucun |

La condition `chantierPrincipal && chantierId !== chantierPrincipal && employe?.role_metier === 'chef'` est extrêmement spécifique et ne peut impacter que les chefs ayant un chantier principal défini ET étant sur un chantier différent.

---

## Plan de test post-implémentation

1. **Purger S07 SDER** une dernière fois
2. **Resynchroniser le planning** manuellement (Admin > Rappels > Synchroniser maintenant)
3. **Vérifier en BDD** :
   - Philippe DURAND sur CI229BALME : fiches_jours avec heures ✅
   - Philippe DURAND sur CI230ROSEYRAN : fiches_jours supprimés (0 entrées) ✅
4. **Tester le flux complet** : Saisie → Signature → Transmission → Vue RH
5. **Vérifier la vue RH consolidée** : Philippe DURAND ne doit apparaître qu'une fois avec 40h

---

## Alternative envisagée et rejetée

**Supprimer entièrement la fiche du chef sur les chantiers secondaires** : Rejeté car cela pourrait créer des incohérences si d'autres parties du code s'attendent à trouver une fiche (ex: pour afficher la ligne en lecture seule).

La solution retenue (vider les `fiches_jours` mais conserver la fiche vide) est plus sûre et permet de garder l'indicateur visuel "Chef en lecture seule sur chantier secondaire".
