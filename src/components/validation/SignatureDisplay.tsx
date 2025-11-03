import { Card } from "@/components/ui/card";
import { RoleBadge } from "@/components/ui/role-badge";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

interface SignatureDisplayProps {
  signatures: Array<{
    maconNom: string;
    signed: boolean;
    signatureData?: string;
    signedAt?: string;
    isChef?: boolean;
    role?: "chef" | "macon" | "interimaire" | "finisseur";
  }>;
}

export const SignatureDisplay = ({ signatures }: SignatureDisplayProps) => {
  return (
    <Card className="p-6 shadow-md border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-4">Signatures des maçons</h3>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {signatures.map((sig, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg border ${
              sig.signed
                ? "bg-success/5 border-success/30"
                : "bg-destructive/5 border-destructive/30"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-medium text-foreground truncate">{sig.maconNom}</span>
                {sig.isChef ? (
                  <RoleBadge role="chef" size="sm" />
                ) : sig.role && sig.role !== "chef" ? (
                  <RoleBadge role={sig.role as "macon" | "interimaire"} size="sm" />
                ) : null}
              </div>
              {sig.signed ? (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 flex-shrink-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Signé
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 flex-shrink-0">
                  <XCircle className="h-3 w-3 mr-1" />
                  Non signé
                </Badge>
              )}
            </div>

            {sig.signed && sig.signatureData ? (
              <div className="space-y-2">
                <div className="bg-background border border-border rounded-lg p-2 h-24 flex items-center justify-center">
                  <img
                    src={sig.signatureData}
                    alt={`Signature de ${sig.maconNom}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                {sig.signedAt && (
                  <p className="text-xs text-muted-foreground text-center">
                    Signé le {new Date(sig.signedAt).toLocaleDateString("fr-FR")} à{" "}
                    {new Date(sig.signedAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            ) : (
              <div className="h-24 bg-muted/30 rounded-lg border border-dashed border-border flex items-center justify-center">
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {signatures.filter((s) => s.signed).length} / {signatures.length} signatures collectées
          </span>
          {signatures.every((s) => s.signed) ? (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Toutes les signatures présentes
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              Signatures incomplètes
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};
