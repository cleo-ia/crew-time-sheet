

## Plan : Tri des employés par rôle puis alphabétique

### Changement

**Fichier : `src/pages/CodesTrajet.tsx`**

Ajouter un `useMemo` qui trie les employés avant le rendu dans chaque accordéon chantier :

1. Définir un ordre de priorité des rôles : `chef` → `macon` → `finisseur` → `grutier`
2. Trier par cet ordre, puis par `nom` alphabétique, puis par `prenom` alphabétique
3. Utiliser cette liste triée à la place de `employes` dans le `.map()` du rendu

```ts
const ROLE_ORDER: Record<string, number> = {
  chef: 0, macon: 1, finisseur: 2, grutier: 3,
};

const sortedEmployes = useMemo(() => {
  if (!employes) return [];
  return [...employes].sort((a, b) => {
    const ra = ROLE_ORDER[a.role_metier ?? ""] ?? 99;
    const rb = ROLE_ORDER[b.role_metier ?? ""] ?? 99;
    if (ra !== rb) return ra - rb;
    const na = (a.nom ?? "").localeCompare(b.nom ?? "", "fr");
    if (na !== 0) return na;
    return (a.prenom ?? "").localeCompare(b.prenom ?? "", "fr");
  });
}, [employes]);
```

Remplacer les 3 occurrences de `employes` dans le JSX (`employes.length`, `employes.map(...)`) par `sortedEmployes`.

