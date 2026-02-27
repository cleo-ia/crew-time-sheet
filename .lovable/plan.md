

## Plan : Cards récap agence — style neutre avec ombre

### Fichier : `src/pages/RapprochementInterim.tsx`

Modifier les 5 cards récap de la vue détail agence :

1. **Toutes les cards** : remplacer les fonds colorés par `bg-card border border-border/50 shadow-md rounded-xl`
2. **Icônes** : toutes en `text-muted-foreground` (neutre uniforme), fond icône en `bg-muted/50`
3. **Valeurs chiffrées** : toutes en `text-foreground font-bold` sauf "H. Normales" en `text-primary font-bold`
4. **Labels** : tous en `text-muted-foreground text-xs`
5. **Dark mode** : supprimer les variantes dark spécifiques (les tokens neutres s'adaptent automatiquement)

