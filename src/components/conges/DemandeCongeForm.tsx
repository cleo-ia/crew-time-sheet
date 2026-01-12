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
import { CalendarIcon, Loader2, AlertTriangle, User, MapPin, UserCheck, Users, ChevronsUpDown, Check } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
    site?: string;
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
  const [typeConge, setTypeConge] = useState<TypeConge | "">("");
  const [dateDebut, setDateDebut] = useState<Date | undefined>();
  const [dateFin, setDateFin] = useState<Date | undefined>();
  const [motif, setMotif] = useState("");
  const [site, setSite] = useState<string>("Senozan");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(true);
  const [openDateDebut, setOpenDateDebut] = useState(false);
  const [openDateFin, setOpenDateFin] = useState(false);
  const [openEmployeeSelect, setOpenEmployeeSelect] = useState(false);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateDebut || !dateFin || !selectedEmployeeId || !typeConge) return;

    onSubmit({
      demandeur_id: selectedEmployeeId,
      type_conge: typeConge as TypeConge,
      date_debut: format(dateDebut, "yyyy-MM-dd"),
      date_fin: format(dateFin, "yyyy-MM-dd"),
      motif: motif.trim() || undefined,
      signature_data: signatureData || undefined,
      site: site.trim() || undefined,
    });
  };

  const handleSignatureSave = (data: string) => {
    setSignatureData(data);
    setShowSignaturePad(false);
  };

  const requiresJustificatif = typeConge ? typesRequiringJustificatif.includes(typeConge as TypeConge) : false;
  const isValid = dateDebut && dateFin && dateFin >= dateDebut && selectedEmployeeId && signatureData && typeConge;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sélecteur d'employé avec recherche */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Employé concerné
        </Label>
        <Popover open={openEmployeeSelect} onOpenChange={setOpenEmployeeSelect} modal={false}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openEmployeeSelect}
              className="w-full justify-between font-normal"
            >
              {selectedEmployee ? (
                <span>{selectedEmployee.prenom} {selectedEmployee.nom}</span>
              ) : (
                <span className="text-muted-foreground">Rechercher un employé...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[--radix-popover-trigger-width] p-0" 
            align="start"
            onWheel={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            <Command>
              <CommandInput placeholder="Rechercher par nom ou prénom..." />
              <CommandList>
                <CommandEmpty>Aucun employé trouvé.</CommandEmpty>
                <CommandGroup>
                  {employees.map((employee) => (
                    <CommandItem
                      key={employee.id}
                      value={`${employee.prenom} ${employee.nom}`}
                      onSelect={() => {
                        setSelectedEmployeeId(employee.id);
                        setOpenEmployeeSelect(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedEmployeeId === employee.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {employee.prenom} {employee.nom}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Champ Site - toujours visible et pré-rempli */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Site
        </Label>
        <input
          type="text"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          placeholder="Site de travail"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
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
            <SelectValue placeholder="Sélectionner un type de congé..." />
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
