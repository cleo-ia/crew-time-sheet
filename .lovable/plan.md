

## Plan : Points 11 et 12

### Point 11 : Onglet Historique dans AbsencesLongueDureeSheet

**Fichier** : `src/components/conges/AbsencesLongueDureeSheet.tsx`

Remplacer la liste simple par des `Tabs` avec deux onglets :

- **"En cours"** (compteur) : absences actives + bouton "Déclarer" + cards avec boutons edit/delete
- **"Historique"** (compteur) : absences terminées (date_fin passée), cards en lecture seule (sans boutons edit/delete), style plus discret

Import de `Tabs, TabsList, TabsTrigger, TabsContent` depuis `@/components/ui/tabs`.

La logique de split `actives` / `terminees` existe déjà (lignes 156-161), il suffit de les placer dans des TabsContent séparés.

---

### Point 12 : Propagation du type_absence dans useUpdateAbsenceLongueDuree

**Fichier** : `src/hooks/useAbsencesLongueDuree.ts`

Dans `useUpdateAbsenceLongueDuree` (ligne 197-225), après le `update` réussi sur `absences_longue_duree`, si `type_absence` est présent dans les params :

1. Récupérer `salarie_id`, `date_debut`, `date_fin` depuis le `data` retourné
2. Chercher toutes les fiches ghost du salarié : `fiches WHERE salarie_id = X AND chantier_id IS NULL AND statut != 'CLOTURE'`
3. Pour chaque fiche ghost trouvée, mettre à jour les `fiches_jours` :
```sql
UPDATE fiches_jours
SET type_absence = :nouveau_type
WHERE fiche_id IN (:ficheIds)
AND date >= :date_debut
AND (date <= :date_fin OR :date_fin IS NULL)
```
4. Invalider aussi `["fiches"]` dans le `onSuccess`

**Risque de régression** : Aucun. On ajoute du code après le update existant (pas de modification du flux actuel). La propagation ne touche que les fiches ghost (chantier_id IS NULL) non clôturées. Les fiches normales ne sont pas affectées.

