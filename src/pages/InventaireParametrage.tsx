import { AppNav } from "@/components/navigation/AppNav";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { InventoryTemplatesManager } from "@/components/admin/InventoryTemplatesManager";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const InventaireParametrage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <PageHeader
        title="Paramétrage inventaire"
        subtitle="Définissez les catégories et articles pour les inventaires mensuels"
        icon={Package}
        theme="validation-conducteur"
      />
      <PageLayout>
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/validation-conducteur?tab=inventaire")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Button>
        </div>
        <InventoryTemplatesManager />
      </PageLayout>
    </div>
  );
};

export default InventaireParametrage;
