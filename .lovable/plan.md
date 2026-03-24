
Objectif validé: corriger définitivement la sync pour qu’elle respecte strictement le planning de la semaine synchronisée, sans toucher à la règle voulue “chef 5/5”.

1) Diagnostic confirmé (base + code)
- En S12, le planning de Bruno Miguel VIANA DA SILVA est bien: MASSILLY (lun-mar-mer), CAPUCINES (jeu), CREUSOT VILET (ven).
- Anomalie observée en base: une ligne fantôme `affectations_jours_chef` sur CAPUCINES le mercredi (hors planning), qui réinjecte ensuite des `fiches_jours` fantômes.
- Cause principale confirmée dans `sync-planning-to-teams`:
  - Les boucles font des `upsert` des jours planifiés.
  - Mais il manque un nettoyage symétrique des jours non planifiés pour le même couple (employé, chantier, semaine) dans plusieurs branches (normal, chef secondaire, fiche protégée).
- Important: je conserve explicitement la logique “chef 5/5 chantier principal” (pas touchée).

2) Plan de correction code (ciblé)
Fichier: `supabase/functions/sync-planning-to-teams/index.ts`
- Introduire un helper interne de sync journalière (idempotent):
  - Entrées: type table (`affectations_jours_chef` ou `affectations_finisseurs_jours`), employé, chantier, semaine, entreprise, joursPlanning.
  - Actions:
    1. upsert des jours planifiés
    2. delete des jours de la semaine (lun-ven) non présents dans `joursPlanning` pour ce même couple
- Remplacer toutes les boucles `upsert` “jours” par ce helper dans les branches suivantes:
  - Chef secondaire (fiche protégée)
  - Chef secondaire (fiche non protégée)
  - Chef responsable sur chantier secondaire (fiche protégée)
  - Chef responsable sur chantier secondaire (fiche non protégée)
  - `createNewAffectation` (branche fiche protégée)
  - `createNewAffectation` (branche standard)
- Ne pas modifier:
  - le garde-fou chef 5/5 principal
  - les protections de statuts fiche (on continue de ne pas écraser les fiches protégées)

3) Audit de non-régression (avant/après) — obligatoire
A. Audit SQL structurel (invariants)
- Invariant 1: pour la semaine ciblée, aucune ligne `affectations_jours_chef` hors planning (hors exception chef 5/5 principal voulue).
- Invariant 2: pour les chantiers avec `chef_id` non null, chaque ligne planning a sa ligne `affectations_jours_chef`.
- Invariant 3: pour les chantiers sans chef mais avec conducteur, chaque ligne planning a sa ligne `affectations_finisseurs_jours`.
- Invariant 4: collisions `fiches_jours` (même salarié, même date, plusieurs chantiers) = 0 pour statuts non protégés.

B. Audit fonctionnel ciblé (S12 + cas voisins)
- Cas Bruno S12:
  - CAPUCINES: uniquement jeudi
  - MASSILLY: lun-mar-mer
  - CREUSOT VILET: ven (côté conducteur)
- Cas chef multi-chantier:
  - vérification que la règle 5/5 principal reste inchangée.
- Cas fiche protégée:
  - pas d’écrasement fiche, mais cohérence des affectations jour côté équipe.
- Cas multi-entreprise:
  - sync ciblée entreprise A n’impacte pas entreprise B.

C. Audit UI end-to-end
- Vérifier en interface chef que les jours affichés par salarié correspondent exactement au planning synchronisé pour le chantier courant.
- Vérifier en interface conducteur les jours des chantiers sans chef (table finisseurs) après sync.

4) Critères d’acceptation
- Après sync S12, aucune ligne fantôme pour Bruno sur CAPUCINES mercredi.
- Les tables d’affectations reflètent strictement le planning jour par jour (sauf garde-fou chef 5/5 conservé).
- Aucun impact régressif sur:
  - chefs secondaires
  - fiches protégées
  - chantiers gérés conducteur
  - isolation multi-tenant.
