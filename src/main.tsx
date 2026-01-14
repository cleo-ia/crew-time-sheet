import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Enregistrement du Service Worker avec auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('🔄 Nouvelle version disponible');
    // Demander confirmation avant de mettre à jour
    if (confirm('Une nouvelle version est disponible. Voulez-vous recharger la page pour l\'appliquer ?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('✅ Application prête pour une utilisation hors-ligne');
  },
  immediate: true
});

createRoot(document.getElementById("root")!).render(<App />);
