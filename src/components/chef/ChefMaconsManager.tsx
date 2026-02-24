import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, CalendarDays } from "lucide-react";
import { useMaconsByChantier } from "@/hooks/useMaconsByChantier";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAffectationsJoursByChef, getDayNamesFromDates } from "@/hooks/useAffectationsJoursChef";

interface ChefMaconsManagerProps {
  chefId: string;
  chantierId: string;
  semaine: string;
  disabled?: boolean;
}

export const ChefMaconsManager = ({ chefId, chantierId, semaine, disabled }: ChefMaconsManagerProps) => {
  const [showDialog, setShowDialog] = useState(false);

  // Récupérer les maçons déjà dans l'équipe
  const { data: currentTeam } = useMaconsByChantier(chantierId, semaine, chefId);
  
  // Récupérer les affectations jours pour ce chef et cette semaine
  const { data: affectationsJoursChef } = useAffectationsJoursByChef(chefId, semaine);

  const teamCount = currentTeam?.filter(m => !m.isChef).length || 0;

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setShowDialog(true)}
        disabled={disabled}
        className="w-full sm:w-auto"
      >
        <Users className="h-4 w-4 mr-2" />
        Mon équipe {teamCount > 0 && `(${teamCount})`}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Mon équipe</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                  ÉQUIPE ACTUELLE
                </h3>
                {currentTeam && currentTeam.length > 0 ? (
                  <div className="space-y-2">
                    {[...currentTeam].sort((a, b) => {
                      const getPriority = (member: typeof a) => {
                        if (member.isChef) return 0;
                        if (member.role === "interimaire") return 2;
                        return 1;
                      };
                      const priorityDiff = getPriority(a) - getPriority(b);
                      if (priorityDiff !== 0) return priorityDiff;
                      const prenomCompare = (a.prenom || "").localeCompare(b.prenom || "", 'fr');
                      if (prenomCompare !== 0) return prenomCompare;
                      return (a.nom || "").localeCompare(b.nom || "", 'fr');
                    }).map((macon) => {
                      // Calculer les jours affectés pour ce membre
                      const memberDaysAffected = affectationsJoursChef
                        ?.filter(a => a.macon_id === macon.id)
                        .map(a => getDayNamesFromDates([a.jour], semaine)[0])
                        .filter(Boolean) || [];
                      
                      const getDayBadges = () => {
                        if (memberDaysAffected.length === 0 || memberDaysAffected.length === 5) {
                          return <Badge variant="outline" className="text-xs">Lun→Ven</Badge>;
                        }
                        const shortDays = memberDaysAffected.map(d => d.substring(0, 3));
                        return (
                          <Badge variant="outline" className="text-xs">
                            {shortDays.join(" ")}
                          </Badge>
                        );
                      };
                      
                      return (
                        <div 
                          key={macon.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            {macon.role === "interimaire" ? (
                              <span className="text-lg">🔄</span>
                            ) : macon.role === "grutier" ? (
                              <span className="text-lg">🏗️</span>
                            ) : !macon.isChef && (
                              <span className="text-lg">👷‍♂️</span>
                            )}
                            <div>
                              <p className="font-medium">
                                {macon.prenom} {macon.nom}
                              </p>
                              {!macon.isChef && (
                                <div className="mt-1">
                                  {getDayBadges()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {macon.isChef ? (
                              <Badge variant="default" className="bg-primary text-primary-foreground">
                                <Crown className="h-3 w-3 mr-1" />
                                Chef
                              </Badge>
                            ) : macon.role === "interimaire" ? (
                              <Badge variant="secondary" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20">
                                Intérimaire
                              </Badge>
                            ) : macon.role === "grutier" ? (
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                Grutier
                              </Badge>
                            ) : macon.role === "finisseur" ? (
                              <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                Finisseur
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                                Maçon
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic p-3 border border-dashed border-border rounded-lg">
                    Aucun membre dans votre équipe pour cette semaine
                  </p>
                )}
              </div>

              {/* Info message */}
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">
                  La composition de l'équipe est gérée par votre conducteur via le planning. Contactez-le pour toute modification.
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
