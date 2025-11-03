import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Building2, User } from "lucide-react";
import { WeekSelector } from "@/components/timesheet/WeekSelector";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUtilisateursByRole } from "@/hooks/useUtilisateurs";

interface FichesFiltersProps {
  filters: {
    semaine: string;
    chantier: string;
    chef: string;
  };
  onFiltersChange: (filters: any) => void;
}

export const FichesFilters = ({ filters, onFiltersChange }: FichesFiltersProps) => {
  const { data: chantiers, isLoading } = useQuery({
    queryKey: ["chantiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chantiers")
        .select("id, nom, code_chantier, ville, actif")
        .eq("actif", true)
        .order("nom");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: chefs, isLoading: isLoadingChefs } = useUtilisateursByRole("chef");

  return (
    <Card className="p-4 shadow-md border-border/50">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Filtrer par semaine
          </label>
          <WeekSelector
            value={filters.semaine}
            onChange={(value) => onFiltersChange({ ...filters, semaine: value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Chantier
          </label>
          <Select
            value={filters.chantier}
            onValueChange={(value) => onFiltersChange({ ...filters, chantier: value })}
            disabled={isLoading}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder={isLoading ? "Chargement..." : "Tous les chantiers"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les chantiers</SelectItem>
              {chantiers && chantiers.length > 0 ? (
                chantiers.map((chantier) => (
                  <SelectItem key={chantier.id} value={chantier.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{chantier.nom}</span>
                      {chantier.code_chantier && (
                        <span className="text-xs text-muted-foreground">
                          {chantier.code_chantier} • {chantier.ville}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))
              ) : (
                !isLoading && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Aucun chantier trouvé
                  </div>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Chef d'équipe
          </label>
          <Select
            value={filters.chef}
            onValueChange={(value) => onFiltersChange({ ...filters, chef: value })}
            disabled={isLoadingChefs}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder={isLoadingChefs ? "Chargement..." : "Tous les chefs"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les chefs</SelectItem>
              {chefs && chefs.length > 0 ? (
                chefs.map((chef) => (
                  <SelectItem key={chef.id} value={chef.id}>
                    {chef.prenom} {chef.nom}
                  </SelectItem>
                ))
              ) : (
                !isLoadingChefs && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Aucun chef trouvé
                  </div>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};
