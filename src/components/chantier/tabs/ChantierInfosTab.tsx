import { Settings } from "lucide-react";

export const ChantierInfosTab = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Settings className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium">Informations du chantier</h3>
      <p className="text-sm text-muted-foreground mt-1">
        L'édition des informations sera disponible prochainement
      </p>
    </div>
  );
};
