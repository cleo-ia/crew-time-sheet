

## Remplir "AUCUN" pour tous les employés sur 2CB-Atelier

### Contexte
- Chantier : `2CB-Atelier` (id: `b68eac6d-...`)
- Entreprise : `edd12053-...`
- 73 employés terrain, 3 déjà configurés → 70 à insérer

### Action
Exécuter une requête SQL `INSERT ... ON CONFLICT DO NOTHING` qui :
1. Sélectionne tous les employés terrain (chef, macon, grutier, finisseur) de l'entreprise
2. Insère une ligne `code_trajet = 'AUCUN'` pour chacun sur le chantier 2CB-Atelier
3. Ne touche pas aux 3 lignes déjà existantes (grâce au `ON CONFLICT`)

Requête unique, pas de modification de code.

