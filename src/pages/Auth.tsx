import { useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import logoLimogeRevillon from "@/assets/logo-limoge-revillon.png";
import logoEngoBourgogne from "@/assets/logo-sder.png";        // Fichier SDER = logo Engo
import logoSder from "@/assets/logo-engo-bourgogne.png";       // Fichier Engo = logo SDER
import bgAuth from "@/assets/bg-auth.png";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useRoleBasedRedirect } from "@/hooks/useRoleBasedRedirect";
import { useAuth } from "@/contexts/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";

// Configuration des entreprises
const ENTREPRISES = [
  { 
    slug: "limoge-revillon", 
    nom: "Limoge Revillon", 
    logo: logoLimogeRevillon,
    couleur: "#ea580c"
  },
  { 
    slug: "engo-bourgogne", 
    nom: "Engo Bourgogne", 
    logo: logoEngoBourgogne,
    couleur: "#1e40af"
  },
  { 
    slug: "sder", 
    nom: "SDER", 
    logo: logoSder,
    couleur: "#059669"
  },
];

const Auth = () => {
  // Sélection entreprise - lire depuis l'URL en priorité
  const [selectedIndex, setSelectedIndex] = useState(() => {
    // 1. D'abord vérifier le paramètre URL (liens email)
    // IMPORTANT: Ne PAS appeler replaceState ici car le hash contient les tokens d'auth
    const urlParams = new URLSearchParams(window.location.search);
    const entrepriseParam = urlParams.get('entreprise');
    if (entrepriseParam) {
      const index = ENTREPRISES.findIndex(e => e.slug === entrepriseParam);
      if (index >= 0) {
        return index;
      }
    }
    // 2. Sinon, utiliser le localStorage
    const savedSlug = localStorage.getItem("entreprise_slug");
    if (savedSlug) {
      const index = ENTREPRISES.findIndex(e => e.slug === savedSlug);
      return index >= 0 ? index : 0;
    }
    return 0;
  });
  const [hasStoredEntreprise, setHasStoredEntreprise] = useState(() => 
    !!localStorage.getItem("entreprise_slug")
  );

  // Connexion
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Invitation: définir le mot de passe
  const [isInviteMode, setIsInviteMode] = useState(false);
  const [invitedUser, setInvitedUser] = useState<SupabaseUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { refetch: getRedirectPath } = useRoleBasedRedirect();
  const queryClient = useQueryClient();

  const selectedEntreprise = ENTREPRISES[selectedIndex];

  // Navigation carrousel
  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? ENTREPRISES.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev === ENTREPRISES.length - 1 ? 0 : prev + 1));
  };

  // Permet de changer d'entreprise si on a déjà mémorisé
  const clearStoredEntreprise = () => {
    localStorage.removeItem("entreprise_slug");
    setHasStoredEntreprise(false);
  };

  // Détecte les tokens d'invitation/récupération dans l'URL et force la session
  useEffect(() => {
    const checkInvitation = async () => {
      const rawHash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      if (!rawHash) return;

      const params = new URLSearchParams(rawHash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type = params.get('type'); // invite, recovery, signup, magiclink

      // Seulement activer le mode "définir mot de passe" pour invite/recovery/signup
      // Les magic links (type=magiclink ou autre) doivent juste connecter l'utilisateur
      const isPasswordSetupFlow = type === 'invite' || type === 'recovery' || type === 'signup';

      if (access_token) {
        try {
          // Toujours établir la session d'abord
          if (refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          } else {
            await supabase.auth.setSession({ access_token, refresh_token: '' });
          }
          
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            if (isPasswordSetupFlow) {
              // Mode invitation/récupération: afficher le formulaire de mot de passe
              setIsInviteMode(true);
              setInvitedUser(session.user);
              toast.info("Veuillez définir votre mot de passe pour finaliser votre compte");
            }
            // Pour les magic links, la session est établie, l'utilisateur sera redirigé normalement
          }
          
          // Nettoie l'URL après traitement des tokens (conserve le pathname)
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error("Auth invitation handling error:", err);
          // Nettoyer l'URL même en cas d'erreur
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    checkInvitation();
  }, []);

  // Note: Redirection automatique désactivée pour éviter les conflits
  // La redirection est gérée uniquement par handleLogin() et handleSetPassword()

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Mot de passe défini, vous êtes connecté.");
      
      // Vérifier si l'utilisateur doit faire l'onboarding
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role, has_completed_onboarding, entreprise_id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        // Récupérer le slug de l'entreprise et le mémoriser
        if (roleData?.entreprise_id) {
          const { data: entreprise } = await supabase
            .from("entreprises")
            .select("slug")
            .eq("id", roleData.entreprise_id)
            .single();
          if (entreprise?.slug) {
            localStorage.setItem("entreprise_slug", entreprise.slug);
            localStorage.setItem("current_entreprise_id", roleData.entreprise_id);
          }
        }
        
        // Si nouvel utilisateur (has_completed_onboarding = false), redirection vers /install
        if (roleData?.has_completed_onboarding === false) {
          navigate("/install", { replace: true });
          return;
        }
        
        // Sinon, redirection normale selon le rôle
        const role = roleData?.role;
        let targetPath = "/";
        switch (role) {
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
      }
    } catch (err: any) {
      toast.error(err?.message || "Impossible de définir le mot de passe");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      
      // Attendre que la session soit propagée
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Récupérer l'utilisateur
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 1. Récupérer l'entreprise_id depuis le slug sélectionné
        const { data: selectedEntrepriseData } = await supabase
          .from("entreprises")
          .select("id")
          .eq("slug", selectedEntreprise.slug)
          .single();
        
        if (!selectedEntrepriseData) {
          await supabase.auth.signOut();
          toast.error("Entreprise non trouvée");
          return;
        }
        
        // 2. Récupérer le rôle de l'utilisateur pour CETTE entreprise spécifiquement
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role, has_completed_onboarding, entreprise_id")
          .eq("user_id", user.id)
          .eq("entreprise_id", selectedEntrepriseData.id)
          .maybeSingle();
        
        // 3. Si pas de rôle pour cette entreprise → erreur
        if (!roleData) {
          await supabase.auth.signOut();
          toast.error(`Vous n'avez pas de rôle dans l'entreprise ${selectedEntreprise.nom}`);
          return;
        }
        
        // Mémoriser l'entreprise pour les prochaines connexions
        localStorage.setItem("entreprise_slug", selectedEntreprise.slug);
        localStorage.setItem("current_entreprise_id", selectedEntrepriseData.id);
        setHasStoredEntreprise(true);
        
        // Invalider tout le cache React Query pour charger les données de la bonne entreprise
        queryClient.clear();
        
        // Nettoyer le sessionStorage des sélections de la session précédente (isolation multi-tenant)
        sessionStorage.removeItem('timesheet_selectedChantier');
        sessionStorage.removeItem('timesheet_selectedChef');
        sessionStorage.removeItem('timesheet_selectedWeek');
        sessionStorage.removeItem('conducteur_teamWeek');
        sessionStorage.removeItem('fromSignature');
        
        toast.success("Connexion réussie");
        
        // Si nouvel utilisateur (has_completed_onboarding = false), redirection vers /install
        if (roleData.has_completed_onboarding === false) {
          navigate("/install", { replace: true });
          return;
        }
        
        const role = roleData.role;
        
        // Déterminer la route selon le rôle
        let targetPath = "/";
        switch (role) {
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
            targetPath = (location.state as any)?.from?.pathname || "/";
        }
        
        // Forcer la cohérence du cache React Query
        queryClient.setQueryData(["role-based-redirect"], targetPath);
        queryClient.setQueryData(["current-user-role"], role);
        
        navigate(targetPath, { replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message || "Impossible de se connecter");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleMagicLink = async () => {
    try {
      setLoginLoading(true);
      const email = loginEmail.trim();
      if (!email) {
        toast.error("Entrez votre email professionnel");
        return;
      }
      if (!/^[a-z0-9._%+-]+@groupe-engo\.com$/i.test(email)) {
        toast.error("Email doit être @groupe-engo.com");
        return;
      }
      const redirectUrl = `${window.location.origin}/auth?entreprise=${selectedEntreprise.slug}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      toast.success("Lien magique envoyé. Vérifiez votre email.");
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'envoyer le lien");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setLoginLoading(true);
      const email = loginEmail.trim();
      if (!email) {
        toast.error("Entrez votre email professionnel");
        return;
      }
      if (!/^[a-z0-9._%+-]+@groupe-engo\.com$/i.test(email)) {
        toast.error("Email doit être @groupe-engo.com");
        return;
      }
      
      // Appel à l'edge function pour envoyer l'email avec branding dynamique
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: email,
          entreprise_slug: selectedEntreprise.slug
        }
      });
      
      if (error) throw error;
      toast.success("Email envoyé pour réinitialiser votre mot de passe.");
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'envoyer l'email");
    } finally {
      setLoginLoading(false);
    }
  };


  return (
    <PageLayout>
      <div
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `url(${bgAuth})` }}
      >
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 w-full max-w-md">
          {/* Carrousel de sélection d'entreprise - toujours visible sauf en mode invitation */}
          {!isInviteMode && (
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              
              <div className="flex gap-2">
                {ENTREPRISES.map((entreprise, index) => (
                  <button
                    key={entreprise.slug}
                    onClick={() => setSelectedIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === selectedIndex 
                        ? "bg-white scale-125" 
                        : "bg-white/40 hover:bg-white/60"
                    }`}
                    aria-label={`Sélectionner ${entreprise.nom}`}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          )}

          <Card key={selectedEntreprise.slug} className="w-full animate-fade-in-up-slow backdrop-blur-sm">
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center mb-4">
                <img 
                  key={`logo-${selectedEntreprise.slug}`}
                  src={selectedEntreprise.logo} 
                  alt={selectedEntreprise.nom} 
                  className="h-28 w-auto object-contain transition-all duration-300" 
                />
              </div>
              <div className="flex items-center justify-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl">Authentification sécurisée</CardTitle>
              </div>
              <CardDescription key={`desc-${selectedEntreprise.slug}`}>
                {isInviteMode
                  ? `Bienvenue ${invitedUser?.email}! Veuillez définir votre mot de passe.`
                  : `Connectez-vous à ${selectedEntreprise.nom}`}
              </CardDescription>
              {hasStoredEntreprise && !isInviteMode && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={clearStoredEntreprise}
                  className="text-xs text-muted-foreground"
                >
                  Changer d'entreprise
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isInviteMode ? (
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Choisissez un mot de passe sécurisé"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirmez votre mot de passe"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={passwordLoading}>
                    {passwordLoading ? "En cours..." : "Définir mon mot de passe"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Adresse email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="nom.prenom@entreprise.fr"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Votre mot de passe"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loginLoading}>
                    {loginLoading ? "Connexion..." : "Se connecter"}
                  </Button>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <Button type="button" variant="secondary" onClick={handleMagicLink} disabled={loginLoading} className="w-full">
                      Recevoir un lien magique par email
                    </Button>
                    <Button type="button" variant="outline" onClick={handleResetPassword} disabled={loginLoading} className="w-full">
                      Définir/Reset mon mot de passe
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default Auth;