import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Fonction pour marquer l'onboarding comme terminé et rediriger selon le rôle
  const completeOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Utilisateur non connecté");
        navigate("/auth", { replace: true });
        return;
      }

      // Mettre à jour le flag d'onboarding
      const { error: updateError } = await supabase
        .from("user_roles")
        .update({ has_completed_onboarding: true })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Erreur lors de la mise à jour de l'onboarding:", updateError);
        toast.error("Erreur lors de la finalisation de l'onboarding");
        return;
      }

      // Récupérer le rôle pour redirection
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      // Redirection basée sur le rôle
      let targetPath = "/";
      switch (roleData?.role) {
        case "conducteur":
          targetPath = "/validation-conducteur";
          break;
        case "chef":
          targetPath = "/";
          break;
        case "rh":
          targetPath = "/consultation-rh";
          break;
        case "admin":
          targetPath = "/admin";
          break;
        default:
          targetPath = "/";
      }

      navigate(targetPath, { replace: true });
    } catch (err) {
      console.error("Erreur completeOnboarding:", err);
      toast.error("Erreur inattendue");
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      toast.success("Application installée avec succès !");
      // Attendre un peu puis rediriger via completeOnboarding
      setTimeout(() => completeOnboarding(), 1500);
    }
    
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Application installée !</CardTitle>
            <CardDescription>
              DIVA RH est maintenant installée sur votre appareil.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={completeOnboarding} className="w-full">
              Ouvrir l'application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Installer DIVA RH</CardTitle>
          <CardDescription>
            Installez l'application sur votre appareil pour un accès rapide et hors-ligne.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p>Accès instantané depuis l'écran d'accueil</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p>Fonctionne hors-ligne (avec cache)</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p>Expérience application native</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p>Pas besoin de l'App Store ou Google Play</p>
            </div>
          </div>

          {deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Installer maintenant
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted text-sm">
                <p className="font-medium mb-2">📱 Sur iPhone :</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Appuyez sur le bouton "Partager"</li>
                  <li>Sélectionnez "Sur l'écran d'accueil"</li>
                  <li>Confirmez l'installation</li>
                </ol>
              </div>
              
              <div className="p-4 rounded-lg bg-muted text-sm">
                <p className="font-medium mb-2">🤖 Sur Android :</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Ouvrez le menu du navigateur</li>
                  <li>Sélectionnez "Installer l'application"</li>
                  <li>Confirmez l'installation</li>
                </ol>
              </div>

              <Button onClick={completeOnboarding} variant="outline" className="w-full">
                Continuer dans le navigateur
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
