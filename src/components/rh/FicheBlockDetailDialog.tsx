import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RoleBadge } from "@/components/ui/role-badge";
import { Loader2, HardHat, UserCheck, Mail, Building2 } from "lucide-react";
import { useFicheBlockDetail, FicheBlockDetail } from "@/hooks/useFicheBlockDetail";
import { useSendUrgentRappel } from "@/hooks/useSendUrgentRappel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salarieId: string | null;
  semaine: string | null;
  salarieName: string;
}

const statutLabel = (statut: string | null): { label: string; className: string } => {
  switch (statut) {
    case null:
      return { label: "Aucune fiche", className: "bg-destructive/10 text-destructive border-destructive/30" };
    case "BROUILLON":
      return { label: "Brouillon", className: "bg-muted text-muted-foreground border-border" };
    case "EN_SIGNATURE":
      return { label: "En signature", className: "bg-warning/10 text-warning border-warning/30" };
    case "VALIDE_CHEF":
      return { label: "Validé chef", className: "bg-success/10 text-success border-success/30" };
    case "VALIDE_CONDUCTEUR":
      return { label: "Validé conducteur", className: "bg-success/10 text-success border-success/30" };
    case "ENVOYE_RH":
      return { label: "Envoyé RH", className: "bg-primary/10 text-primary border-primary/30" };
    case "AUTO_VALIDE":
      return { label: "Auto-validé", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" };
    case "CLOTURE":
      return { label: "Clôturée", className: "bg-muted text-muted-foreground border-border" };
    default:
      return { label: statut || "—", className: "bg-muted text-muted-foreground border-border" };
  }
};

interface ChantierBlockProps {
  block: FicheBlockDetail;
  semaine: string | null;
  showTitle: boolean;
}

const ChantierBlock = ({ block, semaine, showTitle }: ChantierBlockProps) => {
  const sendRappel = useSendUrgentRappel();
  const [confirmTarget, setConfirmTarget] = useState<"chef" | "conducteur" | null>(null);

  const handleSendRappel = (role: "chef" | "conducteur") => {
    if (confirmTarget === role) {
      const targetUserId = role === "chef" ? block.chefId : block.conducteurId;
      if (!targetUserId || !semaine) return;
      sendRappel.mutate(
        {
          targetUserId,
          targetRole: role,
          semaine,
          chantierNom: block.chantierNom,
          teamCount: block.team.length,
        },
        { onSettled: () => setConfirmTarget(null) }
      );
    } else {
      setConfirmTarget(role);
    }
  };

  const showChefButton = (block.diagnostic === "bloque_chef" || block.diagnostic === "mixte") && block.chefId;
  const showConducteurButton = (block.diagnostic === "bloque_conducteur" || block.diagnostic === "mixte") && block.conducteurId;

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">{block.chantierNom}</span>
        </div>
      )}

      {/* Diagnostic badge */}
      <Badge
        variant="outline"
        className={`px-3 py-2 text-sm font-medium ${
          block.diagnostic === "bloque_chef"
            ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800"
            : block.diagnostic === "bloque_conducteur"
            ? "bg-destructive/10 text-destructive border-destructive/30"
            : "bg-muted text-muted-foreground border-border"
        }`}
      >
        {block.diagnosticLabel}
      </Badge>

      {/* Chef & Conducteur info */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <HardHat className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Chef :</span>
          <span className="font-medium">{block.chefNom}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Conducteur :</span>
          <span className="font-medium">{block.conducteurNom}</span>
        </div>
      </div>

      {/* Urgent reminder buttons */}
      <div className="flex flex-wrap gap-2">
        {showChefButton && (
          <Button
            size="sm"
            variant={confirmTarget === "chef" ? "destructive" : "outline"}
            onClick={() => handleSendRappel("chef")}
            disabled={sendRappel.isPending}
          >
            {sendRappel.isPending && confirmTarget === "chef" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Mail className="h-4 w-4 mr-1.5" />
            )}
            {confirmTarget === "chef" ? "Confirmer l'envoi au chef ?" : "Rappel urgent au chef"}
          </Button>
        )}
        {showConducteurButton && (
          <Button
            size="sm"
            variant={confirmTarget === "conducteur" ? "destructive" : "outline"}
            onClick={() => handleSendRappel("conducteur")}
            disabled={sendRappel.isPending}
          >
            {sendRappel.isPending && confirmTarget === "conducteur" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Mail className="h-4 w-4 mr-1.5" />
            )}
            {confirmTarget === "conducteur" ? "Confirmer l'envoi au conducteur ?" : "Rappel urgent au conducteur"}
          </Button>
        )}
      </div>

      {/* Team table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Salarié</TableHead>
            <TableHead className="text-right">Statut fiche</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {block.team.map((member) => {
            const s = statutLabel(member.statut);
            return (
              <TableRow key={member.salarieId}>
                <TableCell className="font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span>{member.nom} {member.prenom}</span>
                    {member.roleMetier && (
                      <RoleBadge role={member.roleMetier as any} size="sm" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className={`text-xs ${s.className}`}>
                    {s.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export const FicheBlockDetailDialog = ({ open, onOpenChange, salarieId, semaine, salarieName }: Props) => {
  const { data, isLoading } = useFicheBlockDetail(salarieId, semaine);
  const weekNum = semaine?.split("-S")[1] || semaine || "";
  const isMulti = (data?.length || 0) > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Détail S{weekNum} — {salarieName}</DialogTitle>
          {data && data.length === 1 && (
            <DialogDescription>{data[0].chantierNom}</DialogDescription>
          )}
          {isMulti && (
            <DialogDescription>{data!.length} chantiers</DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucune donnée trouvée</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            {data.map((block, idx) => (
              <div key={block.chantierId}>
                {idx > 0 && <Separator className="my-4" />}
                <ChantierBlock block={block} semaine={semaine} showTitle={isMulti} />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
