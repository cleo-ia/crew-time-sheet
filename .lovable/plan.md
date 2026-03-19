

## Plan : Générer un Excel des codes trajet par défaut depuis les données RH

### Objectif
Extraire de `fiches_jours` le code trajet le plus fréquemment utilisé par chaque employé terrain sur chaque chantier actif, et produire un fichier Excel téléchargeable.

### Données disponibles
La requête SQL est prête et retourne environ 40+ lignes couvrant les chantiers : AMBERIEU, BECHEVELIN, CAPUCINES, COEUR DE BALME EST, CREUSOT HENRI, DAVOULT, FAMILLE, MAILLARD, NUANCE, QUARANTAINE, VENISSIEUX, VILOGIA, etc.

### Étape unique

**Script Python** (`/tmp/gen_codes_trajet.py`) qui :
1. Exécute une requête `psql` avec `COPY TO STDOUT` pour extraire le code trajet dominant par couple (chantier, employé) depuis les fiches transmises (`ENVOYE_RH`, `AUTO_VALIDE`, `CLOTURE`)
2. Génère un fichier Excel stylé avec `openpyxl` :
   - Colonnes : Chantier, Code Chantier, Ville, Nom, Prénom, Rôle, Code Trajet (le + fréquent), Nb jours observés
   - Couleurs par rôle (orange=Chef, bleu=Maçon, vert=Finisseur, violet=Grutier)
   - Filtres Excel activés
3. Sauvegarde dans `/mnt/documents/codes_trajet_defaut_mars2026.xlsx`

### Résultat attendu
Un fichier Excel que Tanguy peut utiliser comme référence pour saisir les codes trajet dans la page `/codes-trajet`, ou qui pourrait servir de base pour un INSERT automatique dans `codes_trajet_defaut`.

