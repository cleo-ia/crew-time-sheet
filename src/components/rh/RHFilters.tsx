import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Building2, User, Briefcase } from "lucide-react";
import { useUtilisateursByRole } from "@/hooks/useUtilisateurs";
import { useChantiers } from "@/hooks/useChantiers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeCombobox } from "./EmployeeCombobox";

interface RHFiltersProps {
  filters: {
    periode: string;
    semaine: string;
    conducteur: string;
    chantier: string;
    chef: string;
    salarie: string;
    typeSalarie: string;
  };
  onFiltersChange: (filters: any) => void;
}

export const RHFilters = ({ filters, onFiltersChange }: RHFiltersProps) => {
  const { data: conducteurs = [] } = useUtilisateursByRole("conducteur");
  const { data: chantiers = [] } = useChantiers();
  
  const { data: semaines = [] } = useQuery({
    queryKey: ["semaines-disponibles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fiches")
        .select("semaine")
        .not("semaine", "is", null)
        .order("semaine", { ascending: false });
      
      if (error) throw error;
      
      const uniqueSemaines = Array.from(new Set(data?.map(f => f.semaine)));
      return uniqueSemaines;
    },
  });

  return (
    <Card className="p-4 shadow-md border-border/50">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {/* Semaine */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Semaine
          </label>
          <Select
            value={filters.semaine}
            onValueChange={(value) => onFiltersChange({ ...filters, semaine: value })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {semaines.map((sem) => (
                <SelectItem key={sem} value={sem}>{sem}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Conducteur */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Conducteur
          </label>
          <Select
            value={filters.conducteur}
            onValueChange={(value) => onFiltersChange({ ...filters, conducteur: value })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {conducteurs.map((cond) => (
                <SelectItem key={cond.id} value={cond.id}>
                  {cond.prenom} {cond.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chantier */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Chantier
          </label>
          <Select
            value={filters.chantier}
            onValueChange={(value) => onFiltersChange({ ...filters, chantier: value })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {chantiers.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>
                  {ch.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type de salarié */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Type de salarié
          </label>
          <Select
            value={filters.typeSalarie || "all"}
            onValueChange={(value) => onFiltersChange({ ...filters, typeSalarie: value })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="chef">Chefs d'équipe</SelectItem>
              <SelectItem value="macon">Maçons</SelectItem>
              <SelectItem value="interimaire">Intérimaires</SelectItem>
              <SelectItem value="conducteur">Conducteurs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Salarié (recherche) */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Rechercher un salarié
          </label>
          <EmployeeCombobox
            value={filters.salarie || "all"}
            onChange={(value) => onFiltersChange({ ...filters, salarie: value })}
          />
        </div>
      </div>
    </Card>
  );
};
