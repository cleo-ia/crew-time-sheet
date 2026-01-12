import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, AlertTriangle, User, MapPin, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type TypeConge = 
  | "CP" 
  | "RTT" 
  | "MALADIE" 
  | "AUTRE" 
  | "SANS_SOLDE" 
  | "ABSENCE_AUTORISEE" 
  | "ABSENCE_RECUPEREE" 
  | "DECES" 
  | "NAISSANCE" 
  | "MARIAGE";

export interface DemandeurInfo {
  nom: string;
  prenom: string;
  chantierNom?: string;
  conducteurNom?: string;
}

interface DemandeCongeFormProps {
  demandeur?: DemandeurInfo;
  onSubmit: (data: {
    type_conge: TypeConge;
    date_debut: string;
    date_fin: string;
    motif?: string;
    signature_data?: string;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const typeCongeOptions: { value: TypeConge; label: string; requiresJustificatif?: boolean }[] = [
  { value: "CP", label: "Congés payés" },
  { value: "RTT", label: "RTT" },
  { value: "SANS_SOLDE", label: "Congés sans solde" },
  { value: "ABSENCE_AUTORISEE", label: "Absence autorisée" },
  { value: "ABSENCE_RECUPEREE", label: "Absence récupérée" },
  { value: "MALADIE", label: "Arrêt maladie", requiresJustificatif: true },
  { value: "DECES", label: "Congé exceptionnel - Décès", requiresJustificatif: true },
  { value: "NAISSANCE", label: "Congé exceptionnel - Naissance", requiresJustificatif: true },
  { value: "MARIAGE", label: "Congé exceptionnel - Mariage", requiresJustificatif: true },
  { value: "AUTRE", label: "Autre" },
];

const typesRequiringJustificatif: TypeConge[] = ["MALADIE", "DECES", "NAISSANCE", "MARIAGE"];

export const DemandeCongeForm: React.FC<DemandeCongeFormProps> = ({
  demandeur,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [typeConge, setTypeConge] = useState<TypeConge>("CP");
  const [dateDebut, setDateDebut] = useState<Date | undefined>();
  const [dateFin, setDateFin] = useState<Date | undefined>();
  const [motif, setMotif] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateDebut || !dateFin) return;

    onSubmit({
      type_conge: typeConge,
      date_debut: format(dateDebut, "yyyy-MM-dd"),
      date_fin: format(dateFin, "yyyy-MM-dd"),
      motif: motif.trim() || undefined,
      signature_data: signatureData || undefined,
    });
  };

  const handleSignatureSave = (data: string) => {
    setSignatureData(data);
    setShowSignaturePad(false);
  };

  const requiresJustificatif = typesRequiringJustificatif.includes(typeConge);
  const isValid = dateDebut && dateFin && dateFin >= dateDebut;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Infos du demandeur */}
      {demandeur && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {demandeur.prenom} {demandeur.nom}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>Date de demande : {format(new Date(), "d MMMM yyyy", { locale: fr })}</span>
            </div>
            {demandeur.chantierNom && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Chantier : {demandeur.chantierNom}</span>
              </div>
            )}
            {demandeur.conducteurNom && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserCheck className="h-4 w-4" />
                <span>Responsable : {demandeur.conducteurNom}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Type de congé */}
      <div className="space-y-2">
        <Label htmlFor="type">Type de congé / absence</Label>
        <Select value={typeConge} onValueChange={(v) => setTypeConge(v as TypeConge)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeCongeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alerte justificatifs */}
      {requiresJustificatif && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Pièces justificatives à fournir impérativement</strong>
            <br />
            {typeConge === "MALADIE" && "Certificat médical / arrêt de travail"}
            {typeConge === "DECES" && "Acte de décès ou certificat"}
            {typeConge === "NAISSANCE" && "Acte de naissance"}
            {typeConge === "MARIAGE" && "Acte de mariage"}
          </AlertDescription>
        </Alert>
      )}

      {/* Date de début */}
      <div className="space-y-2">
        <Label>Date de début</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateDebut && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateDebut ? format(dateDebut, "PPP", { locale: fr }) : "Sélectionner une date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateDebut}
              onSelect={setDateDebut}
              locale={fr}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Date de fin */}
      <div className="space-y-2">
        <Label>Date de fin (reprise le lendemain)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateFin && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFin ? format(dateFin, "PPP", { locale: fr }) : "Sélectionner une date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFin}
              onSelect={setDateFin}
              locale={fr}
              disabled={(date) => dateDebut ? date < dateDebut : false}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Motif (optionnel) */}
      <div className="space-y-2">
        <Label htmlFor="motif">Motif / Observations (optionnel)</Label>
        <Textarea
          id="motif"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Précisez le motif si nécessaire..."
          rows={3}
        />
      </div>

      <Separator />

      {/* Signature */}
      <div className="space-y-2">
        <Label>Signature du demandeur</Label>
        {signatureData ? (
          <div className="space-y-2">
            <div className="border rounded-lg p-2 bg-background">
              <img 
                src={signatureData} 
                alt="Signature" 
                className="max-h-20 mx-auto"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSignatureData(null);
                setShowSignaturePad(true);
              }}
              className="w-full"
            >
              Modifier la signature
            </Button>
          </div>
        ) : showSignaturePad ? (
          <SignaturePad
            employeeName={demandeur ? `${demandeur.prenom} ${demandeur.nom}` : "Demandeur"}
            onSave={handleSignatureSave}
            onCancel={() => setShowSignaturePad(false)}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSignaturePad(true)}
            className="w-full"
          >
            Ajouter ma signature
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Envoi...
            </>
          ) : (
            "Envoyer la demande"
          )}
        </Button>
      </div>
    </form>
  );
};
