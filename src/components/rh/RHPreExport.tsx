import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import { Download, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { generateRHExcel } from "@/lib/excelExport";
import { fetchRHExportData, RHExportEmployee } from "@/hooks/useRHExport";
import { RHFilters } from "@/hooks/rhShared";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RHPreExportProps {
  filters: RHFilters;
}

type EditableRow = {
  original: RHExportEmployee;
  modified: Partial<RHExportEmployee>;
  isModified: boolean;
};

export const RHPreExport = ({ filters }: RHPreExportProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRHExportData(filters.periode || "", filters);
      const editableRows: EditableRow[] = data.map(emp => ({
        original: emp,
        modified: {},
        isModified: false
      }));
      setRows(editableRows);
      setIsDataLoaded(true);
    } catch (error) {
      console.error("Erreur chargement données pré-export:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellChange = (rowIndex: number, field: keyof RHExportEmployee, value: any) => {
    setRows(prev => {
      const newRows = [...prev];
      const row = newRows[rowIndex];
      
      // Parse numeric values
      const parsedValue = typeof row.original[field] === 'number' && typeof value === 'string'
        ? parseFloat(value) || 0
        : value;
      
      (row.modified as any)[field] = parsedValue;
      row.isModified = Object.keys(row.modified).length > 0;
      
      return newRows;
    });
  };

  const handleReset = () => {
    setRows(prev => prev.map(row => ({
      ...row,
      modified: {},
      isModified: false
    })));
    toast.success("Modifications annulées");
  };

  const handleExport = async () => {
    if (rows.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    setIsLoading(true);
    try {
      // Merge original + modified data
      const mergedData: RHExportEmployee[] = rows.map(row => ({
        ...row.original,
        ...row.modified
      }));

      const filename = await generateRHExcel(mergedData, filters.periode || "");
      toast.success(`Excel généré : ${filename}`);
    } catch (error) {
      console.error("Erreur export Excel:", error);
      toast.error("Erreur lors de la génération de l'Excel");
    } finally {
      setIsLoading(false);
    }
  };

  const modifiedCount = useMemo(() => rows.filter(r => r.isModified).length, [rows]);

  if (!isDataLoaded) {
    return (
      <div className="space-y-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cliquez sur "Charger les données" pour visualiser et modifier les données avant export Excel.
          </AlertDescription>
        </Alert>
        <Button onClick={loadData} disabled={isLoading}>
          {isLoading ? "Chargement..." : "Charger les données"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={handleExport} disabled={isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Générer l'Excel {modifiedCount > 0 && `(${modifiedCount} modif.)`}
          </Button>
          {modifiedCount > 0 && (
            <Button onClick={handleReset} variant="outline" disabled={isLoading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {rows.length} salarié{rows.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="h-[600px] border rounded-lg overflow-auto">
        <div className="min-w-[2400px]">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Contractuel (non éditable) */}
                <TableHead className="bg-slate-100 sticky left-0 z-10 bg-background shadow-sm min-w-[100px]">Matricule</TableHead>
                <TableHead className="bg-slate-100 sticky left-[100px] z-10 bg-background shadow-sm min-w-[120px]">Nom</TableHead>
                <TableHead className="bg-slate-100 min-w-[120px]">Prénom</TableHead>
                <TableHead className="bg-slate-100 min-w-[150px]">Métier</TableHead>
                <TableHead className="bg-slate-100 min-w-[120px]">Statut</TableHead>
                <TableHead className="bg-slate-100 min-w-[100px]">Type contrat</TableHead>
                
                {/* Temps (éditable) */}
                <TableHead className="bg-blue-50 min-w-[100px]">H. Normales</TableHead>
                <TableHead className="bg-blue-50 min-w-[100px]">H. Supp 25%</TableHead>
                <TableHead className="bg-blue-50 min-w-[100px]">H. Supp 50%</TableHead>
                
                {/* Absences (éditable) */}
                <TableHead className="bg-amber-50 min-w-[80px]">CP</TableHead>
                <TableHead className="bg-amber-50 min-w-[80px]">RTT</TableHead>
                <TableHead className="bg-amber-50 min-w-[80px]">AM</TableHead>
                <TableHead className="bg-amber-50 min-w-[80px]">MP</TableHead>
                <TableHead className="bg-amber-50 min-w-[80px]">AT</TableHead>
                <TableHead className="bg-amber-50 min-w-[80px]">CSS</TableHead>
                <TableHead className="bg-amber-50 min-w-[120px]">Autre absence</TableHead>
                
                {/* Indemnités (éditable) */}
                <TableHead className="bg-green-50 min-w-[80px]">Paniers</TableHead>
                <TableHead className="bg-green-50 min-w-[80px]">Trajets</TableHead>
                <TableHead className="bg-green-50 min-w-[100px]">Trajets perso</TableHead>
                <TableHead className="bg-green-50 min-w-[100px]">Intempéries</TableHead>
                
                {/* Textes libres (éditable) */}
                <TableHead className="bg-purple-50 min-w-[200px]">Régul. M-1</TableHead>
                <TableHead className="bg-purple-50 min-w-[200px]">Autres éléments</TableHead>
                <TableHead className="bg-purple-50 min-w-[200px]">Commentaires</TableHead>
                
                {/* Total */}
                <TableHead className="bg-slate-100 min-w-[100px]">Total heures</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const data = { ...row.original, ...row.modified };
                return (
                  <TableRow key={index} className={row.isModified ? "bg-blue-50/30" : ""}>
                    {/* Non éditable */}
                    <TableCell className="sticky left-0 z-10 bg-background font-mono text-xs">{data.matricule}</TableCell>
                    <TableCell className="sticky left-[100px] z-10 bg-background font-medium">{data.nom}</TableCell>
                    <TableCell>{data.prenom}</TableCell>
                    <TableCell className="text-xs">{data.metier}</TableCell>
                    <TableCell className="text-xs">{data.statut}</TableCell>
                    <TableCell className="text-xs">{data.type_contrat}</TableCell>
                    
                    {/* Temps - éditable */}
                    <EditableCell value={data.heuresNormales} onChange={(v) => handleCellChange(index, 'heuresNormales', v)} type="number" isModified={row.modified.heuresNormales !== undefined} />
                    <EditableCell value={data.heuresSupp} onChange={(v) => handleCellChange(index, 'heuresSupp', v)} type="number" isModified={row.modified.heuresSupp !== undefined} />
                    <EditableCell value={0} onChange={() => {}} type="number" disabled /> {/* H. Supp 50% - TODO */}
                    
                    {/* Absences - éditable (par type) */}
                    <EditableCell value={0} onChange={() => {}} type="number" disabled /> {/* CP - TODO calculé depuis detailJours */}
                    <EditableCell value={0} onChange={() => {}} type="number" disabled /> {/* RTT - TODO */}
                    <EditableCell value={0} onChange={() => {}} type="number" disabled /> {/* AM - TODO */}
                    <EditableCell value={0} onChange={() => {}} type="number" disabled /> {/* MP - TODO */}
                    <EditableCell value={0} onChange={() => {}} type="number" disabled /> {/* AT - TODO */}
                    <EditableCell value={0} onChange={() => {}} type="number" disabled /> {/* CSS - TODO */}
                    <EditableCell value={data.absences} onChange={(v) => handleCellChange(index, 'absences', v)} type="number" isModified={row.modified.absences !== undefined} />
                    
                    {/* Indemnités - éditable */}
                    <EditableCell value={data.indemnitesRepas} onChange={(v) => handleCellChange(index, 'indemnitesRepas', v)} type="number" isModified={row.modified.indemnitesRepas !== undefined} />
                    <EditableCell value={data.indemnitesTrajet} onChange={(v) => handleCellChange(index, 'indemnitesTrajet', v)} type="number" isModified={row.modified.indemnitesTrajet !== undefined} />
                    <EditableCell value={data.indemnitesTrajetPerso} onChange={(v) => handleCellChange(index, 'indemnitesTrajetPerso', v)} type="number" isModified={row.modified.indemnitesTrajetPerso !== undefined} />
                    <EditableCell value={data.intemperies} onChange={(v) => handleCellChange(index, 'intemperies', v)} type="number" isModified={row.modified.intemperies !== undefined} />
                    
                    {/* Textes - éditable (depuis detailJours[0]) */}
                    <EditableCell 
                      value={data.detailJours?.[0]?.regularisationM1 || ""} 
                      onChange={(v) => {
                        const newDetails = [...(data.detailJours || [])];
                        if (newDetails[0]) newDetails[0].regularisationM1 = v;
                        handleCellChange(index, 'detailJours', newDetails);
                      }} 
                      type="text" 
                      isModified={row.modified.detailJours !== undefined} 
                    />
                    <EditableCell 
                      value={data.detailJours?.[0]?.autresElements || ""} 
                      onChange={(v) => {
                        const newDetails = [...(data.detailJours || [])];
                        if (newDetails[0]) newDetails[0].autresElements = v;
                        handleCellChange(index, 'detailJours', newDetails);
                      }} 
                      type="text" 
                      isModified={row.modified.detailJours !== undefined} 
                    />
                    <TableCell className="text-xs text-muted-foreground">-</TableCell> {/* Commentaires - TODO */}
                    
                    {/* Total */}
                    <TableCell className="font-semibold">{data.totalHeures.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

// Composant cellule éditable
const EditableCell = ({ 
  value, 
  onChange, 
  type = "number", 
  isModified = false,
  disabled = false
}: { 
  value: number | string; 
  onChange: (v: any) => void; 
  type?: "number" | "text";
  isModified?: boolean;
  disabled?: boolean;
}) => {
  return (
    <TableCell className="p-1">
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`h-8 text-xs text-center ${isModified ? 'border-blue-500 border-2' : ''} ${disabled ? 'bg-muted' : ''}`}
      />
    </TableCell>
  );
};
