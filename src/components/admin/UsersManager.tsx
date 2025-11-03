import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleBadge } from "@/components/ui/role-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit, Trash2, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export const UsersManager = () => {
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState<{ open: boolean; profile?: any }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; profile?: any }>({ open: false });
  const [formData, setFormData] = useState({ first_name: "", last_name: "", email: "", role: "" });

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["all-users-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ["user-roles-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (error) throw error;
      return data;
    },
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Mutation pour mettre à jour un utilisateur
  const updateProfile = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from("utilisateurs")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users-admin"] });
      toast.success("Utilisateur mis à jour avec succès");
      setEditDialog({ open: false });
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Mutation pour mettre à jour le rôle
  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // D'abord supprimer l'ancien rôle
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (deleteError) throw deleteError;

      // Puis insérer le nouveau
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as any });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-all"] });
      toast.success("Rôle mis à jour avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Mutation pour désactiver un utilisateur (non implémenté pour utilisateurs)
  const toggleDisable = useMutation({
    mutationFn: async ({ id, disabled }: { id: string; disabled: boolean }) => {
      // Pour l'instant, on ne gère pas le disabled sur utilisateurs
      // On pourrait ajouter une colonne disabled si besoin
      toast.info("Fonctionnalité non disponible pour ce type d'utilisateur");
      throw new Error("Not implemented");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users-admin"] });
      toast.success("Statut mis à jour");
    },
    onError: (error: any) => {
      // Silently fail for not implemented
    },
  });

  // Mutation pour supprimer un utilisateur
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Supprimer via edge function qui gère la cascade
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users-admin"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles-all"] });
      toast.success("Utilisateur supprimé définitivement");
      setDeleteDialog({ open: false });
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Mutation pour renvoyer l'invitation
  const resendInvitation = useMutation({
    mutationFn: async (invitation: any) => {
      const { error } = await supabase.functions.invoke("invite-user", {
        body: { 
          email: invitation.email,
          role: invitation.role,
          conducteur_id: invitation.conducteur_id
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation renvoyée");
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Mutation pour supprimer une invitation
  const deleteInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation supprimée");
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const getRolePriority = (role: string): number => {
    const priorities: Record<string, number> = {
      admin: 1,
      rh: 2,
      conducteur: 3,
      chef: 4,
      macon: 5,
      finisseur: 6,
      interimaire: 7,
    };
    return priorities[role] || 999;
  };

  const getRoleForUser = (utilisateur: any) => {
    // 1️⃣ Si l'utilisateur a un compte auth → chercher dans user_roles
    if (utilisateur.auth_user_id) {
      const userRole = userRoles?.find((r) => r.user_id === utilisateur.auth_user_id);
      if (userRole) return userRole.role;
    }
    
    // 2️⃣ Vérifier le champ role_metier (pour maçons et finisseurs)
    if (utilisateur.role_metier === "macon") return "macon";
    if (utilisateur.role_metier === "finisseur") return "finisseur";
    
    // 3️⃣ Si c'est un intérimaire → retourner "interimaire"
    if (utilisateur.agence_interim) return "interimaire";
    
    // 4️⃣ Par défaut (ne devrait jamais arriver)
    return "finisseur";
  };

  const handleEdit = (profile: any) => {
    setFormData({
      first_name: profile.prenom || "",
      last_name: profile.nom || "",
      email: profile.email || "",
      role: getRoleForUser(profile),
    });
    setEditDialog({ open: true, profile });
  };

  const handleSave = async () => {
    if (!editDialog.profile) return;
    
    // Mettre à jour dans utilisateurs
    await updateProfile.mutateAsync({
      id: editDialog.profile.id,
      prenom: formData.first_name,
      nom: formData.last_name,
      email: formData.email,
    });

    // Mettre à jour le rôle si changé et si l'utilisateur a un compte auth
    if (formData.role && editDialog.profile.auth_user_id && formData.role !== getRoleForUser(editDialog.profile)) {
      await updateRole.mutateAsync({
        userId: editDialog.profile.auth_user_id,
        role: formData.role,
      });
    }
  };

  if (profilesLoading || rolesLoading || invitationsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Utilisateurs actifs</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles && profiles.length > 0 ? (
                [...profiles].sort((a, b) => {
                  const roleA = getRoleForUser(a);
                  const roleB = getRoleForUser(b);
                  const priorityA = getRolePriority(roleA);
                  const priorityB = getRolePriority(roleB);
                  
                  if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                  }
                  
                  const nameA = `${a.prenom} ${a.nom}`.toLowerCase();
                  const nameB = `${b.prenom} ${b.nom}`.toLowerCase();
                  return nameA.localeCompare(nameB);
                }).map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      {profile.prenom} {profile.nom}
                    </TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>
                      <RoleBadge
                        role={getRoleForUser(profile) as any}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Actif</Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(profile.created_at), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(profile)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, profile })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Aucun utilisateur
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Invitations en attente</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Expire le</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations && invitations.length > 0 ? (
                invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={invitation.role as any} size="sm" />
                    </TableCell>
                    <TableCell>
                      {invitation.status === "pending" && (
                        <Badge variant="outline">En attente</Badge>
                      )}
                      {invitation.status === "accepted" && (
                        <Badge variant="default">Acceptée</Badge>
                      )}
                      {invitation.status === "expired" && (
                        <Badge variant="destructive">Expirée</Badge>
                      )}
                      {invitation.status === "revoked" && (
                        <Badge variant="secondary">Révoquée</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invitation.expires_at), "dd/MM/yyyy HH:mm", {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invitation.created_at), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {invitation.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendInvitation.mutate(invitation)}
                              title="Renvoyer l'invitation"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteInvitation.mutate(invitation.id)}
                              title="Supprimer l'invitation"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Aucune invitation
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog Modification */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'utilisateur
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="rh">RH</SelectItem>
                  <SelectItem value="conducteur">Conducteur</SelectItem>
                  <SelectItem value="chef">Chef</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false })}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={updateProfile.isPending || updateRole.isPending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'utilisateur{" "}
              <strong>{deleteDialog.profile?.prenom} {deleteDialog.profile?.nom}</strong>{" "}
              sera supprimé de la base de données et de l'authentification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.profile && deleteUser.mutate(deleteDialog.profile.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};