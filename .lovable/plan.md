

## Ajouter les indicateurs de jours d'affectation dans le détail des fiches en attente

### Probleme
Dans la dialog de détail, chaque membre de l'équipe affiche un badge statut (Brouillon, Validé chef, etc.) mais on ne voit pas **quels jours** il est affecté sur ce chantier. Pour un employé multi-chantier (ex: CHATELIN L-M-M sur MAILLARD, J-V sur VILLENEUVE), c'est indispensable.

### Solution

**Fichier 1 : `src/hooks/useFicheBlockDetail.ts`**
- Ajouter `jour` au select de `affectations_jours_chef` (ligne 57) : `"chef_id, macon_id, chantier_id, jour"`
- Ajouter un champ `jours: string[]` dans l'interface `TeamMemberStatus` (les dates d'affectation sur ce chantier)
- Lors de la construction de chaque `TeamMemberStatus`, extraire les jours depuis les affectations filtrées par `chantier_id + macon_id`

**Fichier 2 : `src/components/rh/FicheBlockDetailDialog.tsx`**
- Dans la table équipe, ajouter à côté du badge statut les petits indicateurs de jours (L M M J V) — pastilles avec "1" si affecté, vides sinon
- Style identique au `DayIndicator` du planning (carré 6x6, couleur primary si actif) mais en lecture seule (pas cliquable)
- Utiliser les initiales des jours (L, M, M, J, V) au-dessus ou directement les carrés "1"

### Details techniques

| Fichier | Changement |
|---|---|
| `src/hooks/useFicheBlockDetail.ts` | Select `jour`, ajouter `jours: string[]` à `TeamMemberStatus` |
| `src/components/rh/FicheBlockDetailDialog.tsx` | Afficher indicateurs jour L-V à côté du badge statut |

### Resultat attendu
Pour CHATELIN sur VILLENEUVE : on voit les indicateurs J-V actifs. Sur MAILLARD : L-M-M actifs. Le tout à côté du badge "Brouillon".

