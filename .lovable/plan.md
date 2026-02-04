

# Plan : Revenir à la sauvegarde manuelle uniquement pour les conducteurs

## Résumé

Désactiver l'auto-save pour les conducteurs et s'assurer que le bouton "Enregistrer ce chantier" est la seule méthode de sauvegarde. C'est plus fiable car l'utilisateur contrôle explicitement le moment de la sauvegarde.

---

## Modifications techniques

### Fichier : `src/components/timesheet/TimeEntryTable.tsx`

#### 1. Remettre le guard dans l'auto-save debounced (lignes 943-965)

```text
AVANT (ligne 943-944) :
// ✅ Actif pour les chefs ET les conducteurs
useEffect(() => {
  if (readOnly || !hasLoadedData || entries.length === 0 || !chefId) return;

APRÈS :
// ⚠️ DÉSACTIVÉ en mode conducteur (sauvegarde manuelle via bouton "Enregistrer")
useEffect(() => {
  if (isConducteurMode) return;
  if (readOnly || !hasLoadedData || entries.length === 0 || !chefId) return;
```

#### 2. Revenir au mode "chef" uniquement (ligne 954)

```text
AVANT :
mode: isConducteurMode ? "conducteur" : "chef"

APRÈS :
mode: "chef"
```

#### 3. Remettre le guard dans la sauvegarde visibilitychange (lignes 968-991)

```text
AVANT (ligne 968-969) :
// ✅ Actif pour les chefs ET les conducteurs
useEffect(() => {
  const handleVisibilityChange = () => {

APRÈS :
// ⚠️ DÉSACTIVÉ en mode conducteur (sauvegarde manuelle)
useEffect(() => {
  if (isConducteurMode) return;
  
  const handleVisibilityChange = () => {
```

#### 4. Revenir au mode "chef" uniquement (ligne 978)

```text
AVANT :
mode: isConducteurMode ? "conducteur" : "chef"

APRÈS :
mode: "chef"
```

---

## Comportement final

| Rôle | Auto-save | Bouton manuel |
|------|-----------|---------------|
| Chef | ✅ Actif (debounce 1s) | ✅ Disponible |
| Conducteur | ❌ Désactivé | ✅ **Seule méthode** |

---

## Rappel important pour l'utilisateur

Après cette modification, en tant que conducteur :
- **Tu DOIS cliquer sur "Enregistrer ce chantier"** avant de changer d'onglet
- Si tu changes d'onglet sans enregistrer, les modifications seront perdues
- C'est un comportement voulu pour éviter les sauvegardes partielles ou incohérentes

