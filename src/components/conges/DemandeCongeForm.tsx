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
import { CalendarIcon, Loader2, AlertTriangle, User, MapPin, UserCheck, Users } from "lucide-react";
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

export interface Employee {
  id: string;
  nom: string;
  prenom: string;
}

export interface ResponsableInfo {
  nom: string;
  prenom: string;
}

interface DemandeCongeFormProps {
  employees: Employee[];
  responsable: ResponsableInfo;
  chantierNom?: string;
  onSubmit: (data: {
    demandeur_id: string;
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
  employees,
  responsable,
  chantierNom,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [typeConge, setTypeConge] = useState<TypeConge>("CP");
  const [dateDebut, setDateDebut] = useState<Date | undefined>();
  const [dateFin, setDateFin] = useState<Date | undefined>();
  const [motif, setMotif] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [openDateDebut, setOpenDateDebut] = useState(false);
  const [openDateFin, setOpenDateFin] = useState(false);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateDebut || !dateFin || !selectedEmployeeId) return;

    onSubmit({
      demandeur_id: selectedEmployeeId,
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
  const isValid = dateDebut && dateFin && dateFin >= dateDebut && selectedEmployeeId;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sélecteur d'employé */}
      <div className="space-y-2">
        <Label htmlFor="employee" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Employé concerné
        </Label>
        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un employé" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.prenom} {employee.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Infos du demandeur (affiché après sélection) */}
      {selectedEmployee && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {selectedEmployee.prenom} {selectedEmployee.nom}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>Date de demande : {format(new Date(), "d MMMM yyyy", { locale: fr })}</span>
            </div>
            {chantierNom && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Site : {chantierNom}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck className="h-4 w-4" />
              <span>Responsable : {responsable.prenom} {responsable.nom}</span>
            </div>
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
        <Popover open={openDateDebut} onOpenChange={setOpenDateDebut}>
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
              onSelect={(date) => {
                setDateDebut(date);
                setOpenDateDebut(false);
              }}
              locale={fr}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Date de fin */}
      <div className="space-y-2">
        <Label>Date de fin (reprise le lendemain)</Label>
        <Popover open={openDateFin} onOpenChange={setOpenDateFin}>
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
              onSelect={(date) => {
                setDateFin(date);
                setOpenDateFin(false);
              }}
              locale={fr}
              disabled={(date) => dateDebut ? date < dateDebut : false}
              initialFocus
              className="pointer-events-auto"
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
            employeeName={selectedEmployee ? `${selectedEmployee.prenom} ${selectedEmployee.nom}` : "Demandeur"}
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
            Ajouter la signature
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
