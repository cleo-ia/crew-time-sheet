import { Building2 } from "lucide-react";
import { AppNav } from "@/components/navigation/AppNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChantiersManager } from "@/components/admin/ChantiersManager";

const ChantiersPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <PageHeader
        title="Chantiers"
        subtitle="Gérez les chantiers de votre entreprise"
        icon={Building2}
        theme="validation-conducteur"
      />
      <main className="container mx-auto px-4 py-6">
        <ChantiersManager basePath="/chantiers" />
      </main>
    </div>
  );
};

export default ChantiersPage;
