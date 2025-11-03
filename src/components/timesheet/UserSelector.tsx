import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUtilisateursByRole } from "@/hooks/useUtilisateurs";

interface UserSelectorProps {
  role: string;
  value: string;
  onChange: (value: string) => void;
}

export const UserSelector = ({ role, value, onChange }: UserSelectorProps) => {
  const { data: users, isLoading } = useUtilisateursByRole(role);

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Chargement..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={`Sélectionner un ${role}`} />
      </SelectTrigger>
      <SelectContent>
        {users?.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.prenom} {user.nom}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
