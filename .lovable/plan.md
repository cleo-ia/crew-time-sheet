

## Protection contre les double-clics sur les boutons non protegés

### Analyse effectuee

J'ai audité tous les boutons de soumission critiques et les mécanismes de debounce existants.

**Deja protegé (aucune modification) :**
- Page Index (Saisie chef) : garde `isSubmitting` + `disabled` sur le bouton
- Page ValidationConducteur : garde `isSubmitting` + `disabled`
- Page SignatureFinisseurs : garde `isSubmitting` + `disabled`
- Auto-save TimeEntryTable : debounce 1s avec `clearTimeout`
- Auto-save TransportSheet : debounce 2s avec `clearTimeout`
- Auto-save TransportSheetV2 : debounce + save immédiat à la fermeture
- EditableCell RH : debounce 500ms avec `clearTimeout`
- Tous les formulaires admin (InviteUser, CreateUser, Chantiers, etc.) : `isPending` React Query

**3 boutons sans protection (a corriger) :**

### 1. SignatureMacons — "Soumettre au conducteur"
- Ajouter un state `isSubmitting` + garde en haut de `handleFinish`
- Ajouter `disabled={isSubmitting}` + spinner sur le bouton

### 2. FicheDetail — bouton "Valider" (handleValidate)
- Ajouter `disabled={updateStatus.isPending}` sur le bouton de validation

### 3. VehiculesManager — bouton "Ajouter/Modifier"
- Ajouter `disabled={createVehicule.isPending || updateVehicule.isPending}` sur le bouton

### Impact zero sur les debounce existants
Aucun debounce n'est modifié. Les timers auto-save restent identiques (1s, 2s, 500ms). Seuls 3 boutons reçoivent un `disabled` pendant l'exécution de leur action.

### Details techniques
- **Fichiers modifiés** : `SignatureMacons.tsx`, `FicheDetail.tsx`, `VehiculesManager.tsx`
- **Pas de nouveau hook, pas de nouvelle dépendance**
- **Risque de regression** : nul — on ajoute uniquement un `disabled` temporaire pendant le `await`

