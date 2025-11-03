import { useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LogIn, UserPlus, Mail, Lock, User, Shield } from "lucide-react";
import logo from "@/assets/logo-limoge-revillon.png";
import bgAuth from "@/assets/bg-auth.png";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useRoleBasedRedirect } from "@/hooks/useRoleBasedRedirect";
import { useAuth } from "@/contexts/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";

const Auth = () => {
  // Connexion
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Inscription
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

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
  // Détecte les tokens d'invitation/récupération dans l'URL et force la session
  useEffect(() => {
    const checkInvitation = async () => {
      const rawHash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      if (!rawHash) return;

      const params = new URLSearchParams(rawHash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      // Empêche la redirection avant d'afficher le formulaire de mot de passe
      if (access_token) {
        setIsInviteMode(true);
        try {
          if (refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          } else {
            await supabase.auth.setSession({ access_token, refresh_token: '' });
          }
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setInvitedUser(session.user);
            toast.info("Veuillez définir votre mot de passe pour finaliser votre compte");
          }
          // Nettoie l'URL pour éviter les redétections
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error("Auth invitation handling error:", err);
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
      // Récupérer la route appropriée selon le rôle
      const { data: redirectPath } = await getRedirectPath();
      navigate(redirectPath || "/", { replace: true });
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
      
      toast.success("Connexion réussie");
      
      // Attendre que la session soit propagée (délai augmenté pour garantir la cohérence)
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Récupérer le rôle directement
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        
        const role = roleData?.role;
        
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
        
        // Forcer la cohérence du cache React Query pour éviter les conflits futurs
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
      const redirectUrl = `${window.location.origin}/auth`;
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
      const redirectUrl = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      toast.success("Email envoyé pour définir un mot de passe.");
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'envoyer l'email");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSignupLoading(true);
      const redirectUrl = `${window.location.origin}/auth`;
      const [first_name, ...rest] = signupFullName.trim().split(" ");
      const last_name = rest.join(" ");
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: { first_name, last_name },
        },
      });
      if (error) throw error;
      toast.success("Inscription réussie. Vérifiez votre email pour confirmer.");
    } catch (err: any) {
      toast.error(err?.message || "Impossible de créer le compte");
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <PageLayout>
      <div
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `url(${bgAuth})` }}
      >
        <div className="absolute inset-0 bg-black/40" />

        <Card className="w-full max-w-md animate-fade-in-up-slow relative z-10 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="Limoge Revillon" className="h-28 w-auto object-contain" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-2xl">Authentification sécurisée</CardTitle>
            </div>
            <CardDescription>
              {isInviteMode
                ? `Bienvenue ${invitedUser?.email}! Veuillez définir votre mot de passe.`
                : "Connectez-vous ou créez votre compte professionnel"}
            </CardDescription>
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
              <Tabs defaultValue="connexion" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="connexion" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Connexion
                  </TabsTrigger>
                  <TabsTrigger value="inscription" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Inscription
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="connexion">
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
                </TabsContent>

                <TabsContent value="inscription">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-fullname">Nom complet</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-fullname"
                          type="text"
                          placeholder="Prénom Nom"
                          value={signupFullName}
                          onChange={(e) => setSignupFullName(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Adresse email professionnelle</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="nom.prenom@entreprise.fr"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Choisissez un mot de passe sécurisé"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={signupLoading}>
                      {signupLoading ? "Inscription..." : "Créer mon compte"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Auth;
