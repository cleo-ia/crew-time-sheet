import { Users } from "lucide-react";

export const ChantierEquipeTab = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium">Équipe du chantier</h3>
      <p className="text-sm text-muted-foreground mt-1">
        La gestion de l'équipe sera disponible prochainement
      </p>
    </div>
  );
};
