import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useInviteUser } from "@/hooks/useInviteUser";
import { getCurrentEntrepriseId } from "@/lib/entreprise";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentEntrepriseId } from "@/hooks/useCurrentEntrepriseId";
import { Info, UserCheck } from "lucide-react";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillEmail?: string;
  prefillRole?: "admin" | "gestionnaire" | "rh" | "conducteur" | "chef";
}

type UserRole = "admin" | "gestionnaire" | "rh" | "conducteur" | "chef";

export const InviteUserDialog = ({ open, onOpenChange, prefillEmail, prefillRole }: InviteUserDialogProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const inviteUser = useInviteUser();
  const entrepriseIdResult = useCurrentEntrepriseId();
  const entrepriseId = typeof entrepriseIdResult === 'string' ? entrepriseIdResult : entrepriseIdResult?.data;

  // Vérifier si un utilisateur existe déjà avec cet email dans la table utilisateurs
  const { data: existingUtilisateur, isLoading: checkingUser } = useQuery({
    queryKey: ["utilisateur-by-email", email, entrepriseId],
    queryFn: async () => {
      if (!email || !entrepriseId) return null;
      
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("id, prenom, nom, role_metier, auth_user_id")
        .eq("email", email.toLowerCase())
        .eq("entreprise_id", entrepriseId)
        .maybeSingle();

      if (error) {
        console.error("Error checking existing utilisateur:", error);
        return null;
      }
      return data;
    },
    enabled: !!email && email.includes("@") && !!entrepriseId,
  });

  // Pré-remplir les champs si prefillEmail/prefillRole sont fournis
  useEffect(() => {
    if (open) {
      if (prefillEmail) setEmail(prefillEmail);
      if (prefillRole) setRole(prefillRole);
    }
  }, [open, prefillEmail, prefillRole]);

  // Si un utilisateur existe et a un role_metier, suggérer ce rôle
  useEffect(() => {
    if (existingUtilisateur?.role_metier && !prefillRole) {
      const roleMap: Record<string, UserRole> = {
        chef: "chef",
        conducteur: "conducteur",
      };
      if (roleMap[existingUtilisateur.role_metier]) {
        setRole(roleMap[existingUtilisateur.role_metier]);
      }
    }
  }, [existingUtilisateur, prefillRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role) return;

    try {
      const currentEntrepriseId = await getCurrentEntrepriseId();

      await inviteUser.mutateAsync({
        email,
        role: role as UserRole,
        entreprise_id: currentEntrepriseId,
      });

      setEmail("");
      setRole("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error during invitation:", error);
      toast.error("Erreur lors de l'invitation");
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setEmail("");
      setRole("");
    }
    onOpenChange(isOpen);
  };

  const isAlreadyConnected = existingUtilisateur?.auth_user_id != null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un nouvel utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="utilisateur@groupe-engo.com"
              required
              disabled={!!prefillEmail}
            />
            <p className="text-xs text-muted-foreground">
              L'email doit être au domaine @groupe-engo.com
            </p>
          </div>

          {/* Message informatif si utilisateur existe */}
          {existingUtilisateur && !checkingUser && (
            <Alert className={isAlreadyConnected ? "border-green-500/50 bg-green-50 dark:bg-green-950/20" : "border-blue-500/50 bg-blue-50 dark:bg-blue-950/20"}>
              {isAlreadyConnected ? (
                <UserCheck className="h-4 w-4 text-green-600" />
              ) : (
                <Info className="h-4 w-4 text-blue-600" />
              )}
              <AlertDescription className={isAlreadyConnected ? "text-green-800 dark:text-green-200" : "text-blue-800 dark:text-blue-200"}>
                {isAlreadyConnected ? (
                  <>
                    <strong>{existingUtilisateur.prenom} {existingUtilisateur.nom}</strong> dispose déjà d'un compte connecté.
                    L'invitation enverra un email de réinitialisation de mot de passe.
                  </>
                ) : (
                  <>
                    Une fiche RH existe pour <strong>{existingUtilisateur.prenom} {existingUtilisateur.nom}</strong>.
                    L'invitation sera liée automatiquement à cette fiche.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                <SelectItem value="rh">RH</SelectItem>
                <SelectItem value="conducteur">Conducteur</SelectItem>
                <SelectItem value="chef">Chef de chantier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={inviteUser.isPending}>
              {inviteUser.isPending ? "Envoi..." : "Envoyer l'invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
