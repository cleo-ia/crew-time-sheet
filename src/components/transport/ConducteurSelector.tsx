import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMaconsByChantier } from "@/hooks/useMaconsByChantier";

interface ConducteurSelectorProps {
  chantierId: string;
  semaine: string;
  chefId: string;
  value: string;
  onChange: (value: string) => void;
}

export const ConducteurSelector = ({ chantierId, semaine, chefId, value, onChange }: ConducteurSelectorProps) => {
  const { data: macons = [], isLoading } = useMaconsByChantier(chantierId, semaine, chefId);

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
        <SelectValue placeholder="Sélectionner un conducteur" />
      </SelectTrigger>
      <SelectContent>
        {macons.map((macon) => (
          <SelectItem key={macon.id} value={macon.id}>
            {macon.prenom} {macon.nom} {macon.isChef && "(Chef)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
