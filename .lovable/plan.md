

## Correction : vue détail employé RH pour les absences

### Problème
Ligne 732 de `useRHData.ts` : le code détecte les finisseurs en cherchant `chantier_id === null`. Les fiches d'absence (congés, maladie...) ont aussi `chantier_id = null`, donc **tout employé en absence est traité comme un finisseur**. Le filtrage par affectations finisseurs supprime ensuite tous ses jours → "Aucune donnée à afficher".

### Correction (fichier unique : `src/hooks/useRHData.ts`)

**1. Ligne 732 — Détection finisseur par rôle métier**
Remplacer `filteredFiches.some(f => f.chantier_id === null)` par `salarie.role_metier === "finisseur"`. Le champ `role_metier` est déjà chargé ligne 627.

**2. Lignes 780-850 — Mapping chantier pour fiches sans chantier_id**
Quand `chantier_id` est null, récupérer le `type_absence` depuis `fiches_jours` et afficher le libellé correspondant (Congés payés, Maladie, AT, etc.) au lieu d'un chantier vide.

### Zéro régression
- Les vrais finisseurs (`role_metier = "finisseur"`) gardent exactement le même comportement
- Les fiches normales avec chantier ne sont pas touchées
- Seuls les employés en absence voient leurs données s'afficher correctement au lieu de "Aucune donnée"

