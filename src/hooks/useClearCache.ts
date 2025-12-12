/**
 * Hook utilitaire pour vider le cache PWA et recharger l'application
 * Préserve les données de session essentielles (entreprise_slug, current_entreprise_id)
 */
export const clearCacheAndReload = async (): Promise<void> => {
  try {
    // 1. Désactiver et supprimer le Service Worker
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      console.log("[ClearCache] Service Workers désactivés");
    }

    // 2. Vider tous les caches du navigateur (Workbox, etc.)
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log("[ClearCache] Caches navigateur vidés:", cacheNames);
    }

    // 3. Préserver les données essentielles avant de vider le storage
    const entrepriseSlug = localStorage.getItem("entreprise_slug");
    const currentEntrepriseId = localStorage.getItem("current_entreprise_id");

    // 4. Vider localStorage et sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    console.log("[ClearCache] Storage vidé");

    // 5. Restaurer les données essentielles pour éviter de perdre le contexte de connexion
    if (entrepriseSlug) {
      localStorage.setItem("entreprise_slug", entrepriseSlug);
    }
    if (currentEntrepriseId) {
      localStorage.setItem("current_entreprise_id", currentEntrepriseId);
    }
    console.log("[ClearCache] Données essentielles restaurées");

    // 6. Forcer un rechargement complet
    window.location.reload();
  } catch (err) {
    console.error("[ClearCache] Erreur lors du vidage du cache:", err);
    // En cas d'erreur, recharger quand même
    window.location.reload();
  }
};
