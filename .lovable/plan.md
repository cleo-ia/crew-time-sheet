

## Plan : Nettoyer ROLE_ORDER

### Fichier
`src/components/admin/HistoriqueManager.tsx`

### Changement
Réduire `ROLE_ORDER` aux 5 rôles concernés uniquement :

```typescript
const ROLE_ORDER: Record<string, number> = {
  rh: 0,
  conducteur: 1,
  chef: 2,
  gestionnaire: 3,
  admin: 4,
};
```

Supprimer `super_admin`, `grutier`, `macon`, `finisseur`, `interimaire` qui n'ont rien à faire dans cet écran d'historique.

Nettoyer aussi `ROLE_LABELS` pour ne garder que ces 5 rôles.

