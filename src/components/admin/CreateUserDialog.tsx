import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateUtilisateur } from "@/hooks/useUtilisateurs";
import { toast } from "sonner";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateUserDialog = ({ open, onOpenChange }: CreateUserDialogProps) => {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [roleMetier, setRoleMetier] = useState<"chef" | "conducteur" | "macon" | "finisseur" | "grutier" | "interimaire" | "">("");
  const createUtilisateur = useCreateUtilisateur();

  const handleSubmit = async () => {
    if (!nom.trim() || !prenom.trim()) {
      toast.error("Le nom et le prénom sont obligatoires");
      return;
    }

    try {
      await createUtilisateur.mutateAsync({
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim() || undefined,
        role_metier: roleMetier || undefined,
      });
      toast.success(`${prenom.trim()} ${nom.trim()} a été créé(e)`);
      setNom("");
      setPrenom("");
      setEmail("");
      setRoleMetier("");
      onOpenChange(false);
    } catch (error: any) {
      // Le hook gère déjà les doublons, on affiche l'erreur
      toast.error(error.message || "Erreur lors de la création");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un utilisateur</DialogTitle>
          <DialogDescription>
            Pré-créer une fiche utilisateur. L'invitation et le rôle pourront être attribués plus tard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prenom">Prénom *</Label>
            <Input
              id="prenom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Prénom"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (optionnel)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@groupe-engo.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Rôle métier (optionnel)</Label>
            <Select value={roleMetier} onValueChange={(v) => setRoleMetier(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Aucun rôle sélectionné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chef">Chef de chantier</SelectItem>
                <SelectItem value="conducteur">Conducteur</SelectItem>
                <SelectItem value="macon">Maçon</SelectItem>
                <SelectItem value="finisseur">Finisseur</SelectItem>
                <SelectItem value="grutier">Grutier</SelectItem>
                <SelectItem value="interimaire">Intérimaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={createUtilisateur.isPending}>
            {createUtilisateur.isPending ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
