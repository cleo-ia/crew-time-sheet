

## Plan : Combiner dégradé + bordure gauche

### Fichier : `src/pages/RapprochementInterim.tsx` (ligne 136)

Remplacer :
```
bg-primary/5 border-l-4 border-primary rounded-lg p-4
```

Par :
```
bg-gradient-to-r from-primary/5 to-primary/10 border-l-4 border-primary rounded-lg p-4
```

Combine le dégradé bleu subtil avec la bordure gauche épaisse.

