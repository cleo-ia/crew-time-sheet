

## Ajout de matériels supplémentaires au dictionnaire DEFAULT_MATERIALS

### Objectif

Ajouter les nouveaux matériels fournis dans chaque catégorie du dictionnaire `DEFAULT_MATERIALS`, et ajouter l'unité manquante `"Sac"` à `UNIT_OPTIONS`.

### Fichier modifié

`src/components/admin/InventoryTemplatesManager.tsx`

### Changements

**1. Ajouter `"Sac"` à `UNIT_OPTIONS` (ligne 27)**

```typescript
const UNIT_OPTIONS = ["U", "Paire", "Ens", "m", "m²", "Kg", "L", "Boîte", "Lot", "Rouleau", "Sac"];
```

**2. Compléter chaque catégorie dans `DEFAULT_MATERIALS` (lignes 29-91)**

Ajouter les entrées suivantes à la suite des matériels existants dans chaque catégorie :

- **Consommables** : Sacs à gravats (Rouleau), Scellement chimique (U), Électrodes de soudage (Boîte), Gaz pour cloueur (U), Colle carrelage (Sac)
- **Electricité & Éclairage** : Projecteur sur trépied (U), Bloc autonome d'éclairage de sécurité (U), Multiprise de chantier étanche (U), Lampe frontale rechargeable (U)
- **Électroportatif** : Scie sabre (U), Rabot électrique (U), Boulonneuse à chocs (U), Rainureuse à béton (U)
- **Engins & Gros Matériel** : Dumper (U), Nacelle élévatrice (U), Chariot télescopique (U), Groupe électrogène (U)
- **EPI & Sécurité** : Harnais d'antichute (U), Masque respiratoire FFP3 (Boîte), Visière de protection (U), Trousse de secours (U)
- **Gros Œuvre** : Serre-joint de maçon (U), Règle à lisser (U), Taloche de maçon (U), Bac à gâcher (U)
- **Manutention & Levage** : Chariot de manutention (U), Élingue de levage (U), Ventouse de levage (U), Crics hydrauliques (U)
- **Petit Outillage** : Cisaille à tôle (U), Clé à molette (U), Pince multiprise (U), Scie à main (U)
- **Signalisation & Balisage** : Lampe de chantier Flash (U), Ruban de balisage jaune/noir (Rouleau), Grillage de chantier Orange (Rouleau), Socle de barrière Lest (U)
- **Vêtements de travail** : Veste de pluie haute visibilité (U), Casquette de protection (U), Parka de travail Hiver (U), Bermuda de travail (U)

### Risque

Aucun — ajout de données statiques uniquement, aucune logique modifiée.

