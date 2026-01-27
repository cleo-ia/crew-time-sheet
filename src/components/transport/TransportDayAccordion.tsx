import { Plus, Trash2, User, AlertTriangle, Users, CloudRain, Copy } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCallback, useMemo } from "react";
import { useMaconsByChantier } from "@/hooks/useMaconsByChantier";
import { useAffectationsJoursByChef } from "@/hooks/useAffectationsJoursChef";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  isAllAbsent?: boolean;
  isIntemperie?: boolean;
  isMonday?: boolean;
  onDuplicateToWeek?: () => void;
}

export const TransportDayAccordion = ({
  day,
  chantierId,
  semaine,
  chefId,
  conducteurId,
  onUpdate,
  isReadOnly = false,
  isAllAbsent = false,
  isIntemperie = false,
  isMonday = false,
  onDuplicateToWeek,
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
  
  // Récupérer les affectations journalières pour ce chef
  const { data: affectationsJoursChef = [] } = useAffectationsJoursByChef(chefId, semaine);

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
  
  // Le bouton de duplication est visible si c'est lundi et qu'il y a au moins 1 véhicule avec immat
  const canDuplicate = isMonday && day.vehicules.some(v => v.immatriculation) && !isReadOnly;
  
  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher l'ouverture/fermeture de l'accordéon
    onDuplicateToWeek?.();
  };

  return (
    <AccordionItem value={day.date} className={`border rounded-lg mb-2 ${(isAllAbsent || isIntemperie) ? 'bg-muted/50 opacity-75' : ''}`}>
      <AccordionTrigger className="hover:no-underline px-4 py-3">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize">{dayLabel}</span>
            {/* Bouton dupliquer pour le lundi */}
            {canDuplicate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDuplicateClick}
                className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
              >
                <Copy className="h-3 w-3 mr-1" />
                Appliquer à la semaine
              </Button>
            )}
            {/* Badge intempérie (priorité sur absent) */}
            {isIntemperie && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                <CloudRain className="h-3 w-3 mr-1" />
                Intempérie
              </Badge>
            )}
            {/* Badge absent (seulement si pas intempérie) */}
            {isAllAbsent && !isIntemperie && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                <Users className="h-3 w-3 mr-1" />
                Équipe absente
              </Badge>
            )}
            {hasTrajetPersoIssue && !isAllAbsent && !isIntemperie && (
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {(isAllAbsent || isIntemperie)
              ? "Non requis"
              : vehiculeCount === 0 
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
                      currentChantierId={chantierId || undefined}
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
                          macons={macons}
                          date={day.date}
                          value={vehicule.conducteurMatinId}
                          onChange={(value) => updateVehicule(vehicule.id, "conducteurMatinId", value)}
                          disabled={isReadOnly}
                          otherConducteursIds={
                            day.vehicules
                              .filter(v => v.id !== vehicule.id)
                              .map(v => v.conducteurMatinId)
                              .filter(Boolean)
                          }
                          affectationsJoursChef={affectationsJoursChef}
                          chefId={chefId}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Conducteur Soir *</Label>
                        <ConducteurCombobox
                          macons={macons}
                          date={day.date}
                          value={vehicule.conducteurSoirId}
                          onChange={(value) => updateVehicule(vehicule.id, "conducteurSoirId", value)}
                          disabled={isReadOnly}
                          otherConducteursIds={
                            day.vehicules
                              .filter(v => v.id !== vehicule.id)
                              .map(v => v.conducteurSoirId)
                              .filter(Boolean)
                          }
                          affectationsJoursChef={affectationsJoursChef}
                          chefId={chefId}
                        />
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))
          )}
          
          {(isAllAbsent || isIntemperie) ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              {isIntemperie 
                ? "Journée intempérie — aucun véhicule requis"
                : "Toute l'équipe est absente ce jour — aucun véhicule requis"
              }
            </p>
          ) : (
            <Button
              variant="outline"
              onClick={addVehicule}
              className="w-full"
              disabled={isReadOnly}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un véhicule
            </Button>
          )}
        
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
