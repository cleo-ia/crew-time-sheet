import { ChantierDocumentsUpload } from "@/components/admin/ChantierDocumentsUpload";

interface ChantierFichiersTabProps {
  chantierId: string;
}

export const ChantierFichiersTab = ({ chantierId }: ChantierFichiersTabProps) => {
  return (
    <div className="space-y-4">
      <ChantierDocumentsUpload chantierId={chantierId} />
    </div>
  );
};
