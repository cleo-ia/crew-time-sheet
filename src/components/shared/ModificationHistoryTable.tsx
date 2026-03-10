import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FicheModification } from "@/hooks/useModificationsHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleBadge } from "@/components/ui/role-badge";

interface ModificationHistoryTableProps {
  modifications: FicheModification[];
  isLoading: boolean;
}

const ACTION_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  creation: { label: "Création", variant: "default" },
  modification_heures: { label: "Heures", variant: "secondary" },
  modification_statut: { label: "Statut", variant: "outline" },
  signature: { label: "Signature", variant: "default" },
  transmission: { label: "Transmission", variant: "secondary" },
  modification_trajet: { label: "Trajet", variant: "outline" },
  modification_absence: { label: "Absence", variant: "destructive" },
  modification_pre_export: { label: "Pré-export", variant: "secondary" },
  signature_chef: { label: "Signature chef", variant: "default" },
  transmission_conducteur: { label: "Envoi conducteur", variant: "secondary" },
  validation_conducteur: { label: "Validation conducteur", variant: "default" },
  export_paie: { label: "Export paie", variant: "outline" },
  cloture_periode: { label: "Clôture", variant: "destructive" },
  sync_planning: { label: "Sync planning", variant: "outline" },
  creation_interimaire: { label: "Création intérimaire", variant: "default" },
  suppression_interimaire: { label: "Suppression intérimaire", variant: "destructive" },
  creation_vehicule: { label: "Création véhicule", variant: "default" },
  suppression_vehicule: { label: "Suppression véhicule", variant: "destructive" },
};

const PAGE_LABELS: Record<string, string> = {
  "/": "Saisie heures",
  "/signature-macons": "Signatures",
  "/validation-conducteur": "Validation",
  "/consultation-rh": "Consultation RH",
  "/export-paie": "Export paie",
  "/admin": "Administration",
  "/planning": "Planning",
};

function getPageLabel(pageSource: string | null): string | null {
  if (!pageSource) return null;
  const path = pageSource.split("?")[0];
  return PAGE_LABELS[path] || path;
}

const VALID_ROLES = ["super_admin", "admin", "gestionnaire", "chef", "macon", "finisseur", "interimaire", "conducteur", "rh", "grutier"] as const;

export function ModificationHistoryTable({
  modifications,
  isLoading,
}: ModificationHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (modifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune modification enregistrée
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Date/Heure</TableHead>
            <TableHead className="w-[180px]">Utilisateur</TableHead>
            <TableHead className="w-[140px]">Action</TableHead>
            <TableHead>Détails</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modifications.map((mod) => {
            const actionConfig = ACTION_CONFIG[mod.action] || {
              label: mod.action,
              variant: "outline" as const,
            };
            const details = mod.details as Record<string, unknown>;
            const pageLabel = getPageLabel(mod.page_source);

            return (
              <TableRow key={mod.id}>
                <TableCell className="text-sm">
                  {format(new Date(mod.created_at), "dd/MM/yy HH:mm", {
                    locale: fr,
                  })}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{mod.user_name}</span>
                    {mod.user_role && VALID_ROLES.includes(mod.user_role as any) && (
                      <RoleBadge role={mod.user_role as any} size="sm" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={actionConfig.variant}>
                      {actionConfig.label}
                    </Badge>
                    {pageLabel && (
                      <span className="text-xs text-muted-foreground">
                        {pageLabel}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex flex-col gap-0.5">
                    {details.semaine && (
                      <span className="text-muted-foreground">
                        Semaine: {String(details.semaine)}
                      </span>
                    )}
                    {details.chantier && (
                      <span className="text-muted-foreground">
                        Chantier: {String(details.chantier)}
                      </span>
                    )}
                    {details.salarie && (
                      <span className="text-muted-foreground">
                        Salarié: {String(details.salarie)}
                      </span>
                    )}
                    {details.periode && (
                      <span className="text-muted-foreground">
                        Période: {String(details.periode)}
                      </span>
                    )}
                    {details.nbSalaries && (
                      <span className="text-muted-foreground">
                        {String(details.nbSalaries)} salarié(s)
                      </span>
                    )}
                    {mod.champ_modifie && (
                      <span>
                        <span className="font-medium">{mod.champ_modifie}:</span>{" "}
                        {mod.ancienne_valeur && (
                          <span className="text-destructive line-through mr-1">
                            {mod.ancienne_valeur}
                          </span>
                        )}
                        {mod.nouvelle_valeur && (
                          <span className="text-green-600 dark:text-green-400">
                            {mod.nouvelle_valeur}
                          </span>
                        )}
                      </span>
                    )}
                    {details.message && (
                      <span>{String(details.message)}</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
