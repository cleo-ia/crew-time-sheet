

## Plan : Ajout de logs de debug dans la consolidation RH pour tracer le bug de Said

### Contexte
Said GAMINE KERKOUZI (finisseur, S09 février 2026) affiche 0h dans la vue consolidée RH alors que :
- Sa fiche existe en base (statut ENVOYE_RH, chantier OLYMPIA)
- Ses 5 fiches_jours existent (8+8+8+8+7 = 39h)
- La vue détail employé affiche correctement 39h
- Le filtre finisseur ne devrait PAS bloquer (0 entrées dans affectations_finisseurs_jours)
- Le total de fiches_jours (2090) est sous la limite PostgREST

Le fix précédent dans `batchQueryIn` était un bon garde-fou mais n'est pas la cause du problème ici.

### Action
Ajouter des console.log ciblés dans `src/hooks/rhShared.ts` dans `buildRHConsolidation` pour tracer :

1. **Après récupération des fiches** (~ligne 330) : log si la fiche de Said est dans `fichesDuMois`
2. **Après batchQueryIn des fiches_jours** (~ligne 429) : log combien de jours on a pour la fiche de Said
3. **Dans la boucle par salarié** (~ligne 488) : pour Said spécifiquement, log chaque étape (isFinisseur, affectationsMap, nombre de jours trouvés, heures calculées)
4. **Dans la boucle des jours** (~ligne 569) : pour Said, log si un jour est skippé et pourquoi

### Technique
- Fichier : `src/hooks/rhShared.ts`
- Logs temporaires filtrés par nom "GAMINE" pour ne pas polluer la console
- Permettra d'identifier exactement quelle condition supprime les heures

