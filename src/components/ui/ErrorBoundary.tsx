import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = async () => {
    try {
      // Désactiver le Service Worker
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // Vider tous les caches du navigateur
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // Préserver les données essentielles
      const entrepriseSlug = localStorage.getItem("entreprise_slug");
      const currentEntrepriseId = localStorage.getItem("current_entreprise_id");

      // Vider localStorage et sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // Restaurer les données essentielles
      if (entrepriseSlug) localStorage.setItem("entreprise_slug", entrepriseSlug);
      if (currentEntrepriseId) localStorage.setItem("current_entreprise_id", currentEntrepriseId);

      // Recharger la page
      window.location.reload();
    } catch (err) {
      console.error("Erreur lors du vidage du cache:", err);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-destructive/30 rounded-lg shadow-lg p-6 text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              Une erreur est survenue
            </h1>
            <p className="text-sm text-muted-foreground">
              L'application a rencontré un problème inattendu. Veuillez essayer de recharger la page.
            </p>
            {this.state.error && (
              <details className="text-left bg-muted/50 rounded p-3 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Détails techniques
                </summary>
                <pre className="mt-2 overflow-auto text-destructive">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={this.handleReload} className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                Recharger l'application
              </Button>
              <Button
                variant="outline"
                onClick={this.handleClearCacheAndReload}
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Vider le cache et recharger
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
