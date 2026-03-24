
Objectif: corriger l’affichage 0/69 sur `/codes-trajet` quand les données existent déjà en base.

Constat rapide:
- En base, les mappings existent bien (1656 lignes pour Limoge Revillon).
- Le hook `useCodesTrajetDefaut` (`src/hooks/useCodesTrajetDefaut.ts`) fait un seul `.select(...)` sans pagination.
- Avec PostgREST/Supabase, une réponse est plafonnée (typiquement 1000 lignes), donc seule une partie des couples `(chantier_id, salarie_id)` est chargée → plusieurs chantiers affichent 0/69 à tort.

Plan de correction:
1. Mettre en place un chargement paginé dans `useCodesTrajetDefaut`  
   - Lire `codes_trajet_defaut` par pages (`range(from, to)`, taille 1000).  
   - Boucler jusqu’à ce qu’une page retourne `< pageSize`.  
   - Concaténer toutes les lignes, puis construire la `Map` complète.

2. Rendre la pagination déterministe  
   - Ajouter un tri stable (`order("chantier_id")`, puis `order("salarie_id")`) dans chaque page pour éviter des trous/doublons visuels selon l’ordre de retour.

3. Garder le comportement actuel côté UI  
   - `CodesTrajet.tsx` conserve `getDefinedCount` basé sur `mappings.has(...)`; une fois la map complète, les compteurs reflèteront la vraie situation (69/69 là où c’est configuré).

4. Vérification fonctionnelle après implémentation  
   - Ouvrir `/codes-trajet`, vérifier plusieurs chantiers de début/milieu/fin de liste (ex: BECHEVELIN, OLYMPIA, VILOGIA).  
   - Confirmer que seuls les chantiers réellement non configurés restent à 0/69 (ex: `test`, `test 2` si non remplis).  
   - Recharger la page pour valider la stabilité des compteurs.

Détails techniques:
- Fichier principal: `src/hooks/useCodesTrajetDefaut.ts`
- Changement clé: remplacer la requête unique par une récupération “all pages” avant construction de `Map<string,string>`.
- Aucun changement de schéma DB nécessaire, pas de nouveau script SQL requis.
