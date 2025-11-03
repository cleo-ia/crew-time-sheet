import { RoleBadge } from "@/components/ui/role-badge";

interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  isChef: boolean;
  role?: string;
  totalHours: number;
  totalIntemperie: number;
  totalPaniers: number;
  totalTrajets: number;
  totalTrajetsPerso?: number;
  chantiers?: string[];
}

interface EmployeeSummaryTableProps {
  employees: EmployeeSummary[];
}

export const EmployeeSummaryTable = ({ employees }: EmployeeSummaryTableProps) => {
  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun employé trouvé
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
              Employé
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
              Chantiers
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">
              Total heures
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">
              H. Intempérie
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">
              Paniers repas
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">
              Trajets
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">
              Trajets perso
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee, idx) => (
            <tr 
              key={employee.employeeId} 
              className={`border-b border-border/50 ${idx % 2 === 0 ? 'bg-muted/20' : ''} hover:bg-muted/40 transition-colors`}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{employee.employeeName}</span>
                  {employee.isChef ? (
                    <RoleBadge role="chef" size="sm" />
                  ) : employee.role ? (
                    <RoleBadge role={employee.role as any} size="sm" />
                  ) : null}
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {employee.chantiers && employee.chantiers.length > 0 
                  ? employee.chantiers.join(", ") 
                  : "-"}
              </td>
              <td className="text-right py-3 px-4 font-medium text-foreground">
                {employee.totalHours.toFixed(2)}h
              </td>
              <td className="text-right py-3 px-4 text-muted-foreground">
                {employee.totalIntemperie > 0 ? `${employee.totalIntemperie.toFixed(2)}h` : '-'}
              </td>
              <td className="text-right py-3 px-4 text-muted-foreground">
                {employee.totalPaniers}
              </td>
              <td className="text-right py-3 px-4 text-muted-foreground">
                {employee.totalTrajets > 0 ? employee.totalTrajets : '-'}
              </td>
              <td className="text-right py-3 px-4 text-muted-foreground">
                {employee.totalTrajetsPerso && employee.totalTrajetsPerso > 0 ? employee.totalTrajetsPerso : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
