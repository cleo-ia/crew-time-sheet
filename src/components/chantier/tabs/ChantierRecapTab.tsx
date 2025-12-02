import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, User, Users } from "lucide-react";
import type { ChantierDetail } from "@/hooks/useChantierDetail";

interface ChantierRecapTabProps {
  chantier: ChantierDetail;
}

export const ChantierRecapTab = ({ chantier }: ChantierRecapTabProps) => {
  const formatName = (user: { nom: string | null; prenom: string | null } | null | undefined) => {
    if (!user) return "Non assigné";
    return [user.prenom, user.nom].filter(Boolean).join(" ") || "Non assigné";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Localisation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Localisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {chantier.ville && <p className="font-medium">{chantier.ville}</p>}
          {chantier.adresse && <p className="text-muted-foreground">{chantier.adresse}</p>}
          {!chantier.ville && !chantier.adresse && (
            <p className="text-muted-foreground">Non renseigné</p>
          )}
        </CardContent>
      </Card>

      {/* Conducteur */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Conducteur de travaux
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{formatName(chantier.conducteur)}</p>
        </CardContent>
      </Card>

      {/* Chef */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Chef de chantier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{formatName(chantier.chef)}</p>
        </CardContent>
      </Card>

      {/* Description */}
      {chantier.description && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {chantier.description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
