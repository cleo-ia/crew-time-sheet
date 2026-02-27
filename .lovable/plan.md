

## Plan : Dégradé bleu subtil sur le header agence

### Fichier : `src/pages/RapprochementInterim.tsx` (ligne 136)

Remplacer le style actuel du header :
```
bg-muted/30 border-b border-border/50
```

Par un dégradé bleu très subtil utilisant le `--gradient-primary` du design system, en version très atténuée :
```
bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/15
```

Cela utilisera la couleur primary (bleu 210°) de l'app en version très légère, cohérent avec le style sobre établi.

