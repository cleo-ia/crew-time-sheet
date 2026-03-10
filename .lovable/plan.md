

## Refonte Historique en "Dashboard par Utilisateur"

### Architecture

Remplacement du contenu de `HistoriqueManager` par deux sous-composants :

1. **Grille d'utilisateurs** (vue principale)
2. **Sheet de détails** (panneau latéral au clic)

### Modifications

**1. Nouveau hook `src/hooks/useEncadrementUsers.ts`**
- Récupère tous les `user_roles` pour les rôles `admin, rh, gestionnaire, conducteur, chef` dans l'entreprise
- Résout les noms via `utilisateurs` (auth_user_id) puis fallback `profiles`
- Récupère la dernière entrée `fiches_modifications` par user_id pour afficher "Dernière activité"
- Retourne `{ id, name, role, lastActivity: string | null }[]`
- Accepte un filtre de rôle optionnel

**2. Réécriture de `src/components/admin/HistoriqueManager.tsx`**

Interface principale :
- Barre de filtres par rôle : boutons/tabs `Tous | Gestionnaire | RH | Conducteur | Chef`
- Grille responsive (2 cols mobile, 3 cols tablette, 4 cols desktop) de `UserCard`
- Chaque `UserCard` : Avatar initiales coloré selon rôle, nom, `RoleBadge`, "Dernière activité : il y a X jours", bouton "Consulter"
- State `selectedUser` pour ouvrir le Sheet

Sheet de détails :
- `Sheet` côté droit, `sm:max-w-[50vw]`
- Header : avatar + nom + RoleBadge + fermer
- Filtre temporel : `7 jours | 30 jours | Mois en cours`
- Contenu : `ModificationHistoryTable` pré-filtré sur `userId` sélectionné
- Export CSV conservé pour l'utilisateur sélectionné
- Les données (`useModificationsHistory`) ne sont chargées que quand `selectedUser` est non-null (lazy loading)

**3. Réutilisation des composants existants**
- `RoleBadge` pour les badges de rôle
- `ModificationHistoryTable` pour le flux d'activité dans le Sheet
- `useModificationsHistory` avec paramètre `userId` pour le filtrage
- Pattern de Sheet identique à `UserAnalyticsDetailSheet` existant

### Flux de données

```text
HistoriqueManager
├── useEncadrementUsers(roleFilter, entrepriseId)
│   → Grille de UserCards
└── [au clic sur un user]
    └── Sheet ouvert
        └── useModificationsHistory({ userId, period })
            → ModificationHistoryTable
```

### Pas de migration DB nécessaire
Toutes les données existent déjà dans `user_roles`, `utilisateurs`, `profiles`, et `fiches_modifications`.

