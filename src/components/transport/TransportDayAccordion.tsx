import { Plus, Trash2, User, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCallback, useMemo } from "react";
import { useMaconsByChantier } from "@/hooks/useMaconsByChantier";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ConducteurCombobox } from "./ConducteurCombobox";
import { VehiculeCombobox } from "./VehiculeCombobox";
import { TransportVehicle, TransportDayV2 } from "@/types/transport";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TransportDayAccordionProps {
  day: TransportDayV2;
  chantierId: string | null;
  semaine: string;
  chefId: string;
  conducteurId?: string;
  onUpdate: (updatedDay: TransportDayV2) => void;
  isReadOnly?: boolean;
}

export const TransportDayAccordion = ({
  day,
  chantierId,
  semaine,
  chefId,
  conducteurId,
  onUpdate,
  isReadOnly = false,
}: TransportDayAccordionProps) => {
  
  // Récupérer le nom du conducteur connecté
  const { data: conducteurData } = useQuery({
    queryKey: ["conducteur-info", conducteurId],
    queryFn: async () => {
      if (!conducteurId) return null;
      const { data } = await supabase
        .from("utilisateurs")
        .select("prenom, nom")
        .eq("id", conducteurId)
        .single();
      return data;
    },
    enabled: !!conducteurId,
  });

  const conducteurNom = conducteurData 
    ? `${conducteurData.prenom} ${conducteurData.nom}` 
    : "";
  
  // Récupérer les maçons pour détecter les trajets perso
  const { data: macons = [] } = useMaconsByChantier(chantierId, semaine, chefId);

  // Détecter si un conducteur assigné est en "Trajet perso"
  const hasTrajetPersoIssue = useMemo(() => {
    if (!day.vehicules || day.vehicules.length === 0) return false;
    
    return day.vehicules.some((vehicule) => {
      // Vérifier conducteur matin
      if (vehicule.conducteurMatinId) {
        const maconMatin = macons.find(m => m.id === vehicule.conducteurMatinId);
        const jourMatin = maconMatin?.ficheJours?.find(j => j.date === day.date);
        if (jourMatin?.trajet_perso) return true;
      }
      
      // Vérifier conducteur soir
      if (vehicule.conducteurSoirId) {
        const maconSoir = macons.find(m => m.id === vehicule.conducteurSoirId);
        const jourSoir = maconSoir?.ficheJours?.find(j => j.date === day.date);
        if (jourSoir?.trajet_perso) return true;
      }
      
      return false;
    });
  }, [day.vehicules, day.date, macons]);
  
  const addVehicule = useCallback(() => {
    const newVehicule: TransportVehicle = {
      id: crypto.randomUUID(),
      immatriculation: "",
      conducteurMatinId: conducteurId || "",
      conducteurMatinNom: conducteurNom,
      conducteurSoirId: conducteurId || "",
      conducteurSoirNom: conducteurNom,
    };
    
    onUpdate({
      ...day,
      vehicules: [...day.vehicules, newVehicule],
    });
  }, [day, onUpdate, conducteurId, conducteurNom]);

  const removeVehicule = useCallback((vehiculeId: string) => {
    onUpdate({
      ...day,
      vehicules: day.vehicules.filter((v) => v.id !== vehiculeId),
    });
  }, [day, onUpdate]);

  const updateVehicule = useCallback((vehiculeId: string, field: keyof TransportVehicle, value: string) => {
    onUpdate({
      ...day,
      vehicules: day.vehicules.map((v) => {
        if (v.id !== vehiculeId) return v;
        
        const updated = { ...v, [field]: value };
        
        // Auto-remplir les conducteurs si on modifie l'immatriculation en mode conducteur
        if (field === "immatriculation" && value && conducteurId) {
          updated.conducteurMatinId = conducteurId;
          updated.conducteurMatinNom = conducteurNom;
          updated.conducteurSoirId = conducteurId;
          updated.conducteurSoirNom = conducteurNom;
        }
        
        return updated;
      }),
    });
  }, [day, onUpdate, conducteurId, conducteurNom]);

  const dayLabel = format(new Date(day.date), "EEEE dd/MM", { locale: fr });
  const vehiculeCount = day.vehicules.length;
  const completedCount = day.vehicules.filter(
    (v) => v.immatriculation && v.conducteurMatinId && v.conducteurSoirId
  ).length;

  return (
    <AccordionItem value={day.date} className="border rounded-lg mb-2">
      <AccordionTrigger className="hover:no-underline px-4 py-3">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize">{dayLabel}</span>
            {hasTrajetPersoIssue && (
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {vehiculeCount === 0 
              ? "Aucun véhicule" 
              : `${completedCount}/${vehiculeCount} véhicule(s) complet(s)`
            }
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4 pt-2">
          {day.vehicules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun véhicule ajouté pour ce jour
            </p>
          ) : (
            day.vehicules.map((vehicule, index) => (
              <Card key={vehicule.id} className="p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">Véhicule {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVehicule(vehicule.id)}
                    className="h-8 w-8 p-0"
                    disabled={isReadOnly}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Immatriculation *</Label>
                    <VehiculeCombobox
                      value={vehicule.immatriculation}
                      onChange={(value) => updateVehicule(vehicule.id, "immatriculation", value)}
                      disabled={isReadOnly}
                      date={day.date}
                      semaine={semaine}
                      otherVehiculesPlates={
                        day.vehicules
                          .filter(v => v.id !== vehicule.id)
                          .map(v => v.immatriculation)
                      }
                    />
                  </div>
                  
                  {conducteurId ? (
                    <>
                      <div>
                        <Label className="text-xs">Conducteur Matin *</Label>
                        <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{conducteurNom}</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Conducteur Soir *</Label>
                        <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{conducteurNom}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs">Conducteur Matin *</Label>
                        <ConducteurCombobox
                          chantierId={chantierId}
                          semaine={semaine}
                          chefId={chefId}
                          date={day.date}
                          value={vehicule.conducteurMatinId}
                          onChange={(value) => updateVehicule(vehicule.id, "conducteurMatinId", value)}
                          disabled={isReadOnly}
                          otherConducteursIds={
                            day.vehicules
                              .filter(v => v.id !== vehicule.id)
                              .flatMap(v => [v.conducteurMatinId, v.conducteurSoirId])
                              .filter(Boolean)
                          }
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Conducteur Soir *</Label>
                        <ConducteurCombobox
                          chantierId={chantierId}
                          semaine={semaine}
                          chefId={chefId}
                          date={day.date}
                          value={vehicule.conducteurSoirId}
                          onChange={(value) => updateVehicule(vehicule.id, "conducteurSoirId", value)}
                          disabled={isReadOnly}
                          otherConducteursIds={
                            day.vehicules
                              .filter(v => v.id !== vehicule.id)
                              .flatMap(v => [v.conducteurMatinId, v.conducteurSoirId])
                              .filter(Boolean)
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))
          )}
          
          <Button
            variant="outline"
            onClick={addVehicule}
            className="w-full"
            disabled={isReadOnly}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un véhicule
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
