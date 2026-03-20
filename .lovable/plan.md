

## Plan: Redéployer la Edge Function `sync-planning-to-teams`

### Contexte
La cause confirmée du problème (Giovanni S10 manquant en RH) est que la version de la Edge Function exécutée en production lors des syncs S10/S11 ne contenait pas la logique de création des fiches ghost pour les congés validés. Le code source actuel contient bien cette logique (lignes 1640-1768), mais il n'était pas déployé.

### Actions

1. **Redéployer la Edge Function `sync-planning-to-teams`**
   - Utiliser l'outil de déploiement Supabase pour pousser la version actuelle du code en production
   - Cela rendra effective la logique de création des fiches ghost pour les congés validés

2. **Corriger l'erreur de build `main.tsx`**
   - L'erreur "Duplicate data-lov-id" est un artefact du système de build Lovable, pas du code source (le fichier source est correct). Aucune modification nécessaire.

### Résultat attendu
- La prochaine sync automatique (lundi matin) ou manuelle créera correctement les fiches ghost pour les salariés en congé
- Pour rattraper S10/S11, il faudra lancer manuellement la sync depuis le panneau admin pour ces semaines après le redéploiement

