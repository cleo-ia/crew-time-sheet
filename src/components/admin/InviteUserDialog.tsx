import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInviteUser } from "@/hooks/useInviteUser";
import { getCurrentEntrepriseId } from "@/lib/entreprise";
import { toast } from "sonner";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UserRole = "admin" | "rh" | "conducteur" | "chef";

export const InviteUserDialog = ({ open, onOpenChange }: InviteUserDialogProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const inviteUser = useInviteUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role) return;

    try {
      // Récupérer l'entreprise sélectionnée depuis localStorage
      const entrepriseId = await getCurrentEntrepriseId();

      await inviteUser.mutateAsync({
        email,
        role: role as UserRole,
        entreprise_id: entrepriseId, // Passer explicitement l'entreprise sélectionnée
      });

      setEmail("");
      setRole("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error during invitation:", error);
      toast.error("Erreur lors de l'invitation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            />
            <p className="text-xs text-muted-foreground">
              L'email doit être au domaine @groupe-engo.com
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="rh">RH</SelectItem>
                <SelectItem value="conducteur">Conducteur</SelectItem>
                <SelectItem value="chef">Chef de chantier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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