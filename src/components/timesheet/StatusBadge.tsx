import { Badge } from "@/components/ui/badge";
import { FileEdit, PenTool, CheckCircle, Send } from "lucide-react";

interface StatusBadgeProps {
  status: "BROUILLON" | "EN_SIGNATURE" | "VALIDE_CHEF" | "VALIDE_CONDUCTEUR" | "ENVOYE_RH" | "AUTO_VALIDE";
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const statusConfig = {
    BROUILLON: {
      label: "Brouillon",
      icon: FileEdit,
      className: "bg-muted text-muted-foreground border-border",
    },
    EN_SIGNATURE: {
      label: "En signature",
      icon: PenTool,
      className: "bg-warning/10 text-warning border-warning/30",
    },
    VALIDE_CHEF: {
      label: "Validé chef",
      icon: CheckCircle,
      className: "bg-success/10 text-success border-success/30",
    },
    VALIDE_CONDUCTEUR: {
      label: "Validé conducteur",
      icon: CheckCircle,
      className: "bg-success/10 text-success border-success/30",
    },
    AUTO_VALIDE: {
      label: "Auto-validé",
      icon: CheckCircle,
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    },
    ENVOYE_RH: {
      label: "Envoyé RH",
      icon: Send,
      className: "bg-primary/10 text-primary border-primary/30",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`px-3 py-2 text-sm font-medium ${config.className}`}>
      <Icon className="h-4 w-4 mr-2" />
      {config.label}
    </Badge>
  );
};
