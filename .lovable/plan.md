

# Optimisation de robustesse — Historique conducteur

## Ce que ca change pour toi
- Plus jamais besoin de vider le cache manuellement pour voir les bonnes donnees dans l'historique conducteur
- Suppression d'un warning technique invisible dans la console du navigateur

## Garantie zero regression
- Seul l'onglet Historique de la page conducteur est concerne
- Aucune autre page, aucun autre composant, aucune donnee en base n'est touche
- L'affichage reste strictement identique a ce que tu vois maintenant

## Modifications techniques

### Fichier 1 : `src/hooks/useConducteurHistorique.ts`
Ajout de 2 options sur la requete de donnees :
- `staleTime: 0` : les donnees en cache sont toujours reverifiees
- `refetchOnMount: 'always'` : relance la requete a chaque ouverture de l'onglet Historique

### Fichier 2 : `src/components/conducteur/ConducteurHistorique.tsx`
Correction des identifiants React sur les lignes de tableau :
- Table des heures par jour : `key={jour.date}` devient `key={`${jour.date}_${idx}`}`
- Table du transport : `key={jour.date}` devient `key={`${jour.date}_${jour.immatriculation || idx}`}`

