

# Ne plus afficher "Absent" pour le chef multi-chantier sur la page de signatures

## Le probleme

Sur la page de signatures (recap des heures), quand le chef a 0h un jour (parce qu'il est sur son autre chantier), le systeme affiche un badge rouge "Absent". C'est faux : il n'est pas absent, il travaille simplement ailleurs.

On a deja corrige ca sur la page de saisie des heures, mais pas sur la page de signatures qui a sa propre logique d'affichage.

## La solution

Pour le chef (`selectedMacon.isChef`), remplacer le badge "Absent" par un affichage neutre "0h" quand il a 0 heures. Les employes normaux gardent le badge "Absent" comme avant.

## Fichier a modifier

**`src/pages/SignatureMacons.tsx`** - ligne 432

### Avant

```typescript
{jour.HNORM === 0 && jour.HI === 0 ? (
  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs ...">
    Absent
  </Badge>
) : (
  <span className="text-foreground font-medium">{jour.heures}h</span>
)}
```

### Apres

```typescript
{jour.HNORM === 0 && jour.HI === 0 ? (
  selectedMacon.isChef ? (
    <span className="text-muted-foreground font-medium">0h</span>
  ) : (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs dark:bg-red-950 dark:text-red-300 dark:border-red-800">
      Absent
    </Badge>
  )
) : (
  <span className="text-foreground font-medium">{jour.heures}h</span>
)}
```

## Resultat

| Qui | 0h un jour | Avant | Apres |
|-----|-----------|-------|-------|
| Chef | Sur l'autre chantier | Badge rouge "Absent" | "0h" en gris (neutre) |
| Employe normal | Vraiment absent | Badge rouge "Absent" | Badge rouge "Absent" (pas de changement) |
