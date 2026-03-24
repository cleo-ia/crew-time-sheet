

# Plan : Badges de rôle et tri par métier dans FichesNonValideesDialog

## Objectif

Ajouter le badge de rôle (Chef, Maçon, Finisseur, Grutier) à côté de chaque salarié dans le dialog "Fiches en attente" de la page `/export-paie`, et trier la liste par rôle dans l'ordre : Chef → Maçon → Finisseur → Grutier.

## Modifications

### 1. `src/hooks/useExportPaieReadiness.ts`

- Ajouter `role_metier` dans la requête fiches : `utilisateurs!salarie_id(nom, prenom, role_metier)`
- Ajouter `role_metier` dans l'interface `FicheNonValidee`
- Stocker le `role_metier` dans `nonValideesMap`
- Remplacer le tri alphabétique par un tri par rôle (chef=0, macon=1, finisseur=2, grutier=3) puis alphabétique en secondaire

### 2. `src/components/rh/FichesNonValideesDialog.tsx`

- Importer `RoleBadge` depuis `@/components/ui/role-badge`
- Afficher le `RoleBadge` à côté du nom de chaque salarié dans la cellule "Salarié"
- Utiliser la taille `"sm"` pour le badge

### Aucun autre fichier impacté

Le dialog reçoit déjà `fichesNonValidees` en props depuis `ExportPaie.tsx` — pas de changement nécessaire dans la page parent.

## Détails techniques

Ordre de tri par rôle :
```text
1. chef         (priorité 0)
2. macon        (priorité 1)
3. finisseur    (priorité 2)
4. grutier      (priorité 3)
5. autre/null   (priorité 4)
```

Interface `FicheNonValidee` mise à jour :
```typescript
export interface FicheNonValidee {
  salarieId: string;
  nom: string;
  prenom: string;
  semaines: string[];
  roleMetier: string | null;  // nouveau
}
```

