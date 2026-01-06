import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AppNav } from "@/components/navigation/AppNav";
import { PageLayout } from "@/components/layout/PageLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Users,
  FileText,
  FileCheck,
  FileSpreadsheet,
  Settings,
  ChevronRight,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Clock,
  Truck,
  PenTool,
  Send,
  Download,
  Lock,
  MessageCircle,
  CloudSun,
  Moon,
  Smartphone,
  HardHat,
  ClipboardList,
  UserPlus,
  Building2,
  Car,
  Bell,
  History,
  BarChart3,
  Image,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import des images de documentation
import docSaisieHeures from "@/assets/doc-saisie-heures.png";
import docSaisieHeuresDetail from "@/assets/doc-saisie-heures-detail.png";
import docSignaturePad from "@/assets/doc-signature-pad.png";
import docValidation from "@/assets/doc-validation.png";
import docExportExcel from "@/assets/doc-export-excel.png";
import docDashboard from "@/assets/doc-dashboard.png";
import docSelectionSemaineChantier from "@/assets/doc-selection-semaine-chantier.png";
import docRatioGlobal from "@/assets/doc-ratio-global.png";
import docGestionFinisseurs from "@/assets/doc-gestion-finisseurs.png";
import docRhFiltres from "@/assets/doc-rh-filtres.png";
import docRhConsolide from "@/assets/doc-rh-consolide.png";
import docFicheTrajet from "@/assets/doc-fiche-trajet.png";
import docCollecteSignaturesBtn from "@/assets/doc-collecte-signatures-btn.png";
import docPreExportDetail from "@/assets/doc-pre-export-detail.png";

// Types
interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  subsections?: { id: string; title: string }[];
}

// Sections de navigation
const sections: Section[] = [
  {
    id: "introduction",
    title: "Introduction",
    icon: <BookOpen className="h-4 w-4" />,
    subsections: [
      { id: "presentation", title: "Présentation" },
      { id: "flux-travail", title: "Flux de travail" },
      { id: "concepts-cles", title: "Concepts clés" },
    ],
  },
  {
    id: "chef",
    title: "Guide Chef de chantier",
    icon: <HardHat className="h-4 w-4" />,
    subsections: [
      { id: "chef-connexion", title: "Connexion et sélection" },
      { id: "chef-equipe", title: "Gestion de l'équipe" },
      { id: "chef-saisie", title: "Saisie des heures" },
      { id: "chef-transport", title: "Fiche de trajet" },
      { id: "chef-ratio", title: "Ratio global" },
      { id: "chef-signature", title: "Collecte des signatures" },
      { id: "chef-historique", title: "Historique" },
    ],
  },
  {
    id: "conducteur",
    title: "Guide Conducteur",
    icon: <FileCheck className="h-4 w-4" />,
    subsections: [
      { id: "conducteur-finisseurs", title: "Gestion des finisseurs" },
      { id: "conducteur-validation", title: "Validation des fiches" },
      { id: "conducteur-historique", title: "Historique" },
    ],
  },
  {
    id: "rh",
    title: "Guide Service RH",
    icon: <FileSpreadsheet className="h-4 w-4" />,
    subsections: [
      { id: "rh-filtres", title: "Filtres et navigation" },
      { id: "rh-consolide", title: "Vue consolidée" },
      { id: "rh-preexport", title: "Pré-export et qualifications" },
      { id: "rh-export", title: "Export Excel" },
      { id: "rh-interimaires", title: "Export intérimaires" },
      { id: "rh-cloture", title: "Clôture de période" },
    ],
  },
  {
    id: "admin",
    title: "Guide Administrateur",
    icon: <Settings className="h-4 w-4" />,
    subsections: [
      { id: "admin-dashboard", title: "Dashboard" },
      { id: "admin-utilisateurs", title: "Gestion des utilisateurs" },
      { id: "admin-chantiers", title: "Gestion des chantiers" },
      { id: "admin-referentiels", title: "Référentiels" },
      { id: "admin-rappels", title: "Rappels automatiques" },
    ],
  },
  {
    id: "commun",
    title: "Fonctionnalités communes",
    icon: <Users className="h-4 w-4" />,
    subsections: [
      { id: "commun-messagerie", title: "Messagerie interne" },
      { id: "commun-meteo", title: "Météo du chantier" },
      { id: "commun-theme", title: "Mode sombre" },
      { id: "commun-pwa", title: "Application mobile (PWA)" },
    ],
  },
];

// Composants de documentation
const DocSection = ({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section id={id} className="scroll-mt-20 mb-12">
    <div className="flex items-center gap-3 mb-6">
      {icon && <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>}
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
    </div>
    <div className="space-y-6">{children}</div>
  </section>
);

const DocSubsection = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) => (
  <div id={id} className="scroll-mt-20 mb-8">
    <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
      <ChevronRight className="h-5 w-5 text-primary" />
      {title}
    </h3>
    <div className="pl-4 border-l-2 border-primary/20 space-y-4">{children}</div>
  </div>
);

const DocStep = ({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
      {number}
    </div>
    <div className="flex-1">
      <h4 className="font-medium text-foreground mb-2">{title}</h4>
      <div className="text-muted-foreground">{children}</div>
    </div>
  </div>
);

const DocNote = ({
  type,
  children,
}: {
  type: "info" | "warning" | "success";
  children: React.ReactNode;
}) => {
  const styles = {
    info: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
      title: "Conseil",
    },
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
      title: "Attention",
    },
    success: {
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      title: "Bonne pratique",
    },
  };

  const style = styles[type];

  return (
    <div className={cn("p-4 rounded-lg border", style.bg, style.border)}>
      <div className="flex items-start gap-3">
        {style.icon}
        <div>
          <p className="font-medium text-foreground mb-1">{style.title}</p>
          <div className="text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
};

// Composant pour afficher des images/captures d'écran avec zoom
const DocImage = ({
  src,
  alt,
  caption,
  fullWidth = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  fullWidth?: boolean;
}) => (
  <figure className="my-6">
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30 cursor-zoom-in hover:border-primary/50 transition-colors group">
          <img
            src={src}
            alt={alt}
            className={`w-full h-auto object-contain ${fullWidth ? 'max-h-96' : 'max-h-80'}`}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
              Cliquer pour agrandir
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
        />
      </DialogContent>
    </Dialog>
    {caption && (
      <figcaption className="mt-2 text-center text-sm text-muted-foreground italic">
        {caption}
      </figcaption>
    )}
  </figure>
);

// Composant placeholder pour les captures d'écran à ajouter
const DocScreenshotPlaceholder = ({
  description,
}: {
  description: string;
}) => (
  <div className="my-6 p-6 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
    <div className="flex items-center gap-3 text-primary">
      <Camera className="h-6 w-6" />
      <div>
        <p className="font-medium">Capture d'écran à ajouter</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  </div>
);

const FlowDiagram = () => (
  <div className="flex flex-wrap items-center justify-center gap-2 p-6 bg-muted/50 rounded-lg">
    <Badge variant="outline" className="py-2 px-4 text-sm">
      <HardHat className="h-4 w-4 mr-2" />
      Chef de chantier
    </Badge>
    <ArrowRight className="h-5 w-5 text-muted-foreground" />
    <Badge variant="outline" className="py-2 px-4 text-sm">
      <PenTool className="h-4 w-4 mr-2" />
      Saisie & Signatures
    </Badge>
    <ArrowRight className="h-5 w-5 text-muted-foreground" />
    <Badge variant="outline" className="py-2 px-4 text-sm">
      <FileCheck className="h-4 w-4 mr-2" />
      Conducteur
    </Badge>
    <ArrowRight className="h-5 w-5 text-muted-foreground" />
    <Badge variant="outline" className="py-2 px-4 text-sm">
      <CheckCircle2 className="h-4 w-4 mr-2" />
      Validation
    </Badge>
    <ArrowRight className="h-5 w-5 text-muted-foreground" />
    <Badge variant="outline" className="py-2 px-4 text-sm">
      <FileSpreadsheet className="h-4 w-4 mr-2" />
      Service RH
    </Badge>
    <ArrowRight className="h-5 w-5 text-muted-foreground" />
    <Badge variant="outline" className="py-2 px-4 text-sm">
      <Download className="h-4 w-4 mr-2" />
      Export Paie
    </Badge>
  </div>
);

// Sidebar de navigation
const DocSidebar = ({
  activeSection,
  onSectionClick,
  isMobileOpen,
  onMobileClose,
}: {
  activeSection: string;
  onSectionClick: (id: string) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}) => {
  return (
    <>
      {/* Overlay mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border transform transition-transform duration-300 lg:static lg:transform-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border lg:hidden">
          <span className="font-semibold">Navigation</span>
          <Button variant="ghost" size="icon" onClick={onMobileClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-4rem)] lg:h-[calc(100vh-8rem)]">
          <nav className="p-4 space-y-2">
            {sections.map((section) => (
              <div key={section.id}>
                <button
                  onClick={() => {
                    onSectionClick(section.id);
                    onMobileClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {section.icon}
                  <span className="font-medium text-sm">{section.title}</span>
                </button>

                {section.subsections && (
                  <div className="ml-6 mt-1 space-y-1">
                    {section.subsections.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          onSectionClick(sub.id);
                          onMobileClose();
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-sm rounded transition-colors",
                          activeSection === sub.id
                            ? "text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {sub.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
};

// Page principale
const Documentation = () => {
  const [activeSection, setActiveSection] = useState("introduction");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }

        if (section.subsections) {
          for (const sub of section.subsections) {
            const subElement = document.getElementById(sub.id);
            if (subElement) {
              const { offsetTop, offsetHeight } = subElement;
              if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                setActiveSection(sub.id);
                break;
              }
            }
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <PageLayout>
      <AppNav />

      <div className="flex min-h-[calc(100vh-4rem)]">
        <DocSidebar
          activeSection={activeSection}
          onSectionClick={scrollToSection}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 overflow-auto">
          {/* Header mobile */}
          <div className="sticky top-0 z-30 flex items-center gap-4 p-4 bg-background/95 backdrop-blur border-b border-border lg:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">Documentation</h1>
          </div>

          <div className="max-w-4xl mx-auto p-6 lg:p-8">
            {/* Header */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Documentation DIVA RH</h1>
                  <p className="text-muted-foreground">
                    Guide complet pour la gestion des heures et fiches de chantier
                  </p>
                </div>
              </div>
            </div>

            {/* ============ INTRODUCTION ============ */}
            <DocSection id="introduction" title="Introduction" icon={<BookOpen className="h-5 w-5" />}>
              <DocSubsection id="presentation" title="Présentation de DIVA RH">
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">DIVA RH</strong> est une application de gestion des heures et des fiches de chantier
                  conçue pour le secteur du BTP. Elle permet de suivre le temps de travail des équipes,
                  de collecter les signatures, et de transmettre les données au service RH pour l'export paie.
                </p>
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Fonctionnalités principales :</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Saisie des heures par les chefs de chantier
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Collecte des signatures numériques
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Validation par les conducteurs de travaux
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Export Excel pour la paie
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Gestion des intérimaires
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </DocSubsection>

              <DocSubsection id="flux-travail" title="Flux de travail global">
                <p className="text-muted-foreground mb-4">
                  Le processus suit un flux linéaire du terrain vers le service RH :
                </p>
                <FlowDiagram />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Rythme hebdomadaire
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Les fiches sont saisies chaque semaine du lundi au vendredi.
                        La transmission au conducteur se fait généralement le vendredi.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Send className="h-4 w-4 text-primary" />
                        Export mensuel
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Le service RH consolide les données mensuellement et génère
                        l'export Excel pour le logiciel de paie.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </DocSubsection>

              <DocSubsection id="concepts-cles" title="Concepts clés">
                <div className="grid gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Semaine</h4>
                      <p className="text-sm text-muted-foreground">
                        Identifiée par son numéro (ex: S01, S02...). Format : <code className="bg-muted px-1 rounded">YYYY-WXX</code>.
                        La semaine courante et la suivante sont accessibles pour la saisie.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Fiche</h4>
                      <p className="text-sm text-muted-foreground">
                        Document hebdomadaire regroupant les heures d'un salarié sur un chantier.
                        Contient : heures normales, absences, paniers, trajets.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Statuts de fiche</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary">BROUILLON</Badge>
                        <Badge variant="secondary">EN_SIGNATURE</Badge>
                        <Badge variant="secondary">VALIDE_CHEF</Badge>
                        <Badge variant="secondary">VALIDE_CONDUCTEUR</Badge>
                        <Badge variant="secondary">ENVOYE_RH</Badge>
                        <Badge variant="secondary">CLOTURE</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </DocSubsection>
            </DocSection>

            <Separator className="my-12" />

            {/* ============ GUIDE CHEF ============ */}
            <DocSection id="chef" title="Guide Chef de chantier" icon={<HardHat className="h-5 w-5" />}>
              <DocSubsection id="chef-connexion" title="Connexion et sélection">
                <div className="space-y-4">
                  <DocStep number={1} title="Se connecter">
                    <p>Accédez à l'application et connectez-vous avec votre email et mot de passe.</p>
                  </DocStep>
                  <DocStep number={2} title="Sélectionner la semaine">
                    <p>
                      Utilisez le sélecteur de semaine pour choisir la semaine à saisir.
                      Vous pouvez saisir la semaine courante ou la semaine suivante.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Sélectionner le chantier">
                    <p>
                      Si vous êtes affecté à plusieurs chantiers, sélectionnez celui sur lequel vous souhaitez travailler.
                    </p>
                  </DocStep>
                </div>
                <DocImage 
                  src={docSelectionSemaineChantier} 
                  alt="Sélection de la semaine et du chantier" 
                  caption="Sélecteurs de semaine (2) et de chantier (3)"
                />
                <DocNote type="info">
                  Vos sélections sont mémorisées pour votre prochaine visite.
                </DocNote>
              </DocSubsection>

              <DocSubsection id="chef-equipe" title="Gestion de l'équipe">
                <div className="space-y-4">
                  <DocStep number={1} title="Ouvrir la gestion d'équipe">
                    <p>Cliquez sur le bouton <strong>"Gérer mon équipe"</strong> pour accéder au panneau de gestion.</p>
                  </DocStep>
                  <DocStep number={2} title="Ajouter un membre">
                    <p>
                      Sélectionnez un salarié dans la liste déroulante. Vous pouvez ajouter des maçons,
                      grutiers ou intérimaires affectés à votre chantier.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Retirer un membre">
                    <p>Cliquez sur l'icône de suppression à côté du nom du salarié.</p>
                  </DocStep>
                </div>
                <DocNote type="warning">
                  Retirer un membre supprime ses fiches <strong>non signées</strong> pour cette semaine.
                  Les fiches déjà signées sont conservées.
                </DocNote>
                <div className="mt-4 space-y-4">
                  <DocStep number={4} title="Dissoudre l'équipe">
                    <p>
                      Cette action retire <strong>tous</strong> les membres de l'équipe d'un coup.
                      Utilisez-la en fin de chantier ou pour un changement complet d'équipe.
                    </p>
                  </DocStep>
                  <DocStep number={5} title="Transférer vers un autre chantier">
                    <p>
                      Permet de déplacer toute l'équipe vers un autre chantier dont vous êtes responsable.
                      Les affectations sont automatiquement mises à jour.
                    </p>
                  </DocStep>
                </div>
              </DocSubsection>

              <DocSubsection id="chef-saisie" title="Saisie des heures">
                <p className="text-muted-foreground mb-4">
                  Le tableau de saisie affiche une ligne par salarié et une colonne par jour (Lundi à Vendredi).
                </p>
                <DocImage 
                  src={docSaisieHeures} 
                  alt="Tableau de saisie des heures" 
                  caption="Liste des salariés avec leurs heures totales"
                />
                <DocImage 
                  src={docSaisieHeuresDetail} 
                  alt="Détail de saisie par jour" 
                  caption="Détail de saisie : heures, intempérie, panier repas et trajet pour chaque jour"
                />
                <div className="space-y-4">
                  <DocStep number={1} title="Heures normales (HNORM)">
                    <p>
                      Saisissez le nombre d'heures travaillées pour chaque jour.
                      Le total est calculé automatiquement.
                    </p>
                  </DocStep>
                  <DocStep number={2} title="Absence">
                    <p>
                      Cochez la case <strong>"Absent"</strong> si le salarié n'a pas travaillé ce jour.
                      Le type d'absence sera qualifié par le service RH.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Heures d'intempérie (HI)">
                    <p>
                      En cas d'arrêt pour intempéries, saisissez le nombre d'heures concernées.
                    </p>
                  </DocStep>
                  <DocStep number={4} title="Panier repas (PA)">
                    <p>Cochez si le salarié a droit au panier repas ce jour.</p>
                  </DocStep>
                  <DocStep number={5} title="Trajet">
                    <p>
                      Indiquez le type de trajet effectué par le salarié :
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                      <li><strong>"Trajet"</strong> : le salarié a effectué un trajet classique</li>
                      <li><strong>"Trajet perso"</strong> : le salarié utilise son véhicule personnel</li>
                      <li><strong>"GD"</strong> : Grand Déplacement</li>
                    </ul>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Les codes trajet détaillés (T1, T2, etc.) sont renseignés par le service RH lors du pré-export.
                    </p>
                  </DocStep>
                </div>
                <DocNote type="success">
                  <strong>Auto-sauvegarde :</strong> Vos données sont sauvegardées automatiquement
                  toutes les 30 secondes. Vous pouvez aussi cliquer sur "Enregistrer maintenant".
                </DocNote>
              </DocSubsection>

              <DocSubsection id="chef-transport" title="Fiche de trajet">
                <p className="text-muted-foreground mb-4">
                  La fiche de trajet doit être remplie <strong>complètement</strong> avant de passer à la signature.
                </p>
                <DocImage 
                  src={docFicheTrajet} 
                  alt="Interface fiche de trajet" 
                  caption="Formulaire de saisie des trajets par jour"
                />
                <div className="space-y-4">
                  <DocStep number={1} title="Ouvrir la section Transport">
                    <p>Dépliez la section "Fiche de trajet" sous le tableau de saisie.</p>
                  </DocStep>
                  <DocStep number={2} title="Pour chaque jour">
                    <p>Renseignez :</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong>Conducteur Aller</strong> : qui conduit le matin</li>
                      <li><strong>Conducteur Retour</strong> : qui conduit le soir</li>
                      <li><strong>Véhicule</strong> : immatriculation du véhicule utilisé</li>
                    </ul>
                  </DocStep>
                </div>
                <DocNote type="warning">
                  Les 15 champs (5 jours × 3 informations) doivent être remplis pour pouvoir
                  transmettre la fiche au conducteur.
                </DocNote>
              </DocSubsection>

              <DocSubsection id="chef-ratio" title="Ratio global">
                <p className="text-muted-foreground mb-4">
                  Le <strong>Ratio Global</strong> permet de saisir les quantités journalières 
                  de production pour suivre la performance du chantier.
                </p>
                <DocImage 
                  src={docRatioGlobal} 
                  alt="Interface Ratio Global" 
                  caption="Tableau de saisie des ratios journaliers"
                />
                <div className="space-y-4">
                  <DocStep number={1} title="Ouvrir la section Ratio Global">
                    <p>
                      Dépliez la section <strong>"Ratio Global"</strong> située sous la fiche de trajet.
                    </p>
                  </DocStep>
                  <DocStep number={2} title="Saisir les quantités">
                    <p>Pour chaque jour de la semaine, renseignez :</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong>M³ béton</strong> : volume de béton coulé</li>
                      <li><strong>ML voile</strong> : mètres linéaires de voile</li>
                      <li><strong>M² coffrage</strong> : surface de coffrage mise en œuvre</li>
                      <li><strong>Météo</strong> : conditions météorologiques du jour</li>
                      <li><strong>Observations</strong> : remarques sur le déroulement du chantier</li>
                      <li><strong>Incident</strong> : tout incident survenu sur le chantier</li>
                    </ul>
                  </DocStep>
                  <DocStep number={3} title="Totaux automatiques">
                    <p>
                      Les totaux hebdomadaires sont calculés automatiquement en bas du tableau
                      pour M³ béton, ML voile et M² coffrage.
                    </p>
                  </DocStep>
                </div>
                <DocNote type="info">
                  Ces données alimentent les indicateurs de rentabilité du chantier
                  et permettent d'analyser la productivité de l'équipe.
                </DocNote>
              </DocSubsection>

              <DocSubsection id="chef-signature" title="Collecte des signatures">
                <DocImage 
                  src={docCollecteSignaturesBtn} 
                  alt="Bouton enregistrer et collecter les signatures" 
                  caption="Cliquez sur 'Enregistrer et collecter les signatures' (1)"
                />
                <DocImage 
                  src={docSignaturePad} 
                  alt="Pad de signature numérique" 
                  caption="Interface de signature numérique sur mobile"
                />
                <div className="space-y-4">
                  <DocStep number={1} title="Passer à la signature">
                    <p>
                      Cliquez sur <strong>"Enregistrer et collecter les signatures"</strong>.
                      L'application vérifie que la fiche de trajet est complète.
                    </p>
                  </DocStep>
                  <DocStep number={2} title="Signatures des maçons">
                    <p>
                      Chaque salarié vérifie ses heures affichées puis signe sur le pad tactile.
                      Une fois signé, passez au suivant.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Signature du chef">
                    <p>
                      Le chef de chantier signe en dernier pour valider l'ensemble de la fiche.
                    </p>
                  </DocStep>
                  <DocStep number={4} title="Transmission">
                    <p>
                      Cliquez sur <strong>"Valider"</strong>.
                      La fiche passe en statut "VALIDE_CHEF" et sera visible par le conducteur.
                    </p>
                  </DocStep>
                </div>
                <DocNote type="info">
                  Après transmission, l'application bascule automatiquement vers la semaine suivante
                  avec les données de transport copiées.
                </DocNote>
              </DocSubsection>

              <DocSubsection id="chef-historique" title="Historique">
                <p className="text-muted-foreground">
                  L'onglet <strong>"Historique"</strong> permet de consulter les fiches des semaines précédentes.
                  Vous pouvez voir le statut de chaque fiche et accéder au détail.
                </p>
                <DocNote type="info">
                  Les fiches validées par le conducteur ou clôturées ne sont plus modifiables.
                </DocNote>
              </DocSubsection>
            </DocSection>

            <Separator className="my-12" />

            {/* ============ GUIDE CONDUCTEUR ============ */}
            <DocSection id="conducteur" title="Guide Conducteur de travaux" icon={<FileCheck className="h-5 w-5" />}>
              <DocSubsection id="conducteur-finisseurs" title="Gestion des finisseurs (Onglet 'Mes heures')">
                <p className="text-muted-foreground mb-4">
                  Cet onglet vous permet de gérer les heures des finisseurs sous votre responsabilité.
                </p>
                <div className="space-y-4">
                  <DocStep number={1} title="Sélectionner la semaine">
                    <p>Choisissez la semaine à saisir dans le sélecteur.</p>
                  </DocStep>
                  <DocStep number={2} title="Affecter les finisseurs">
                    <p>
                      Utilisez le tableau d'affectation pour indiquer sur quel chantier
                      chaque finisseur travaille, jour par jour.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Saisir les heures">
                    <p>
                      Pour chaque finisseur, renseignez les heures travaillées, les paniers,
                      et les codes trajet comme pour un chef de chantier.
                    </p>
                  </DocStep>
                  <DocStep number={4} title="Fiche de trajet">
                    <p>Complétez la fiche de trajet de chaque finisseur.</p>
                  </DocStep>
                  <DocStep number={5} title="Signer en tant que conducteur">
                    <p>
                      Passez à la signature et signez en tant que conducteur de travaux pour valider les fiches.
                    </p>
                  </DocStep>
                </div>
                <DocImage 
                  src={docGestionFinisseurs} 
                  alt="Interface de gestion des finisseurs" 
                  caption="Sélection de semaine (1) et affectation des finisseurs (2)"
                />
              </DocSubsection>

              <DocSubsection id="conducteur-validation" title="Validation des fiches (Onglet 'Validation')">
                <p className="text-muted-foreground mb-4">
                  Cet onglet affiche les fiches transmises par les chefs de chantier et en attente de validation.
                </p>
                <DocImage 
                  src={docValidation} 
                  alt="Interface de validation des fiches" 
                  caption="Workflow de validation - les fiches progressent de BROUILLON à ENVOYE_RH"
                />
                <div className="space-y-4">
                  <DocStep number={1} title="Voir les fiches en attente">
                    <p>
                      La liste affiche les fiches avec le statut "VALIDE_CHEF".
                      Un badge indique le nombre de fiches en attente.
                    </p>
                  </DocStep>
                  <DocStep number={2} title="Consulter le détail">
                    <p>
                      Cliquez sur une fiche pour voir le détail : heures, paniers, trajets, signatures.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Valider et signer">
                    <p>
                      Si tout est correct, cliquez sur <strong>"Valider"</strong> puis 
                      <strong> signez</strong> pour confirmer. La signature est obligatoire 
                      pour transmettre la fiche au service RH (statut "ENVOYE_RH").
                    </p>
                  </DocStep>
                  <DocStep number={4} title="Signaler une erreur">
                    <p>
                      Si vous détectez une erreur après validation, utilisez le bouton 
                      <strong> "Conversation"</strong> situé en haut à droite de la page 
                      pour notifier le service RH des corrections à apporter.
                    </p>
                  </DocStep>
                </div>
                <DocNote type="success">
                  Validez les fiches au fur et à mesure pour éviter l'accumulation en fin de mois.
                </DocNote>
              </DocSubsection>

              <DocSubsection id="conducteur-historique" title="Historique">
                <p className="text-muted-foreground">
                  L'onglet "Historique" permet de consulter les fiches validées des semaines précédentes.
                </p>
              </DocSubsection>
            </DocSection>

            <Separator className="my-12" />

            {/* ============ GUIDE RH ============ */}
            <DocSection id="rh" title="Guide Service RH" icon={<FileSpreadsheet className="h-5 w-5" />}>
              <DocSubsection id="rh-filtres" title="Filtres et navigation">
                <DocImage src={docRhFiltres} alt="Interface de filtrage RH" caption="Vue d'ensemble de la page Consultation RH avec les filtres" fullWidth />
                <div className="space-y-4">
                  <DocStep number={1} title="Configurer les filtres">
                    <p>Utilisez les filtres disponibles pour affiner votre recherche :</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Période (mois à traiter)</li>
                      <li>Semaine spécifique</li>
                      <li>Conducteur de travaux</li>
                      <li>Chantier</li>
                      <li>Chef de chantier</li>
                      <li>Salarié</li>
                      <li>Type de salarié (CDI, Intérimaire, etc.)</li>
                    </ul>
                  </DocStep>
                </div>
              </DocSubsection>

              <DocSubsection id="rh-consolide" title="Vue consolidée par salarié">
                <p className="text-muted-foreground mb-4">
                  Cette vue affiche un récapitulatif par employé sur la période sélectionnée.
                </p>
                <DocImage
                  src={docRhConsolide}
                  alt="Vue consolidée par salarié avec le tableau récapitulatif"
                  caption="Vue consolidée par salarié avec le tableau récapitulatif"
                  fullWidth={true}
                />
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Colonnes affichées :</h4>
                  <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <li>• Salarié</li>
                    <li>• Chantier</li>
                    <li>• Type</li>
                    <li>• H. Normales</li>
                    <li>• H. Supp</li>
                    <li>• Absences</li>
                    <li>• Paniers</li>
                    <li>• Trajets perso</li>
                    <li>• Agence</li>
                    <li>• Statut</li>
                    <li>• Actions</li>
                  </ul>
                  </CardContent>
                </Card>
                <p className="text-muted-foreground mt-4">
                  Cliquez sur un employé pour voir le détail semaine par semaine.
                </p>
              </DocSubsection>

              <DocSubsection id="rh-preexport" title="Pré-export : qualification des absences et trajets">
                <p className="text-muted-foreground mb-4">
                  Avant l'export, vous devez qualifier toutes les absences et renseigner les trajets manquants.
                </p>
                <DocImage 
                  src={docPreExportDetail} 
                  alt="Détail jour par jour avec absences et trajets à qualifier" 
                  caption="Vue détaillée avec colonnes Type d'absence et Trajet à compléter"
                />
                <div className="space-y-4">
                  <DocStep number={1} title="Identifier les absences non qualifiées">
                    <p>Un badge orange s'affiche <strong>à côté du nom de l'employé</strong> sur les fiches contenant des absences à qualifier.</p>
                  </DocStep>
                  <DocStep number={2} title="Qualifier l'absence">
                    <p>Cliquez sur <strong>l'icône œil</strong> dans la colonne "Action" pour ouvrir le détail de la fiche, puis sélectionnez le type d'absence :</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">CP - Congés payés</Badge>
                      <Badge variant="outline">RTT</Badge>
                      <Badge variant="outline">AM - Maladie</Badge>
                      <Badge variant="outline">AT - Accident du travail</Badge>
                      <Badge variant="outline">ABS - Absence injustifiée</Badge>
                    </div>
                  </DocStep>
                  <DocStep number={3} title="Renseigner les trajets manquants">
                    <p>Les trajets marqués <strong>"À compléter"</strong> sont <strong>encadrés en rouge dans la colonne Trajet</strong>. Cliquez sur <strong>l'icône œil</strong> dans la colonne "Action" pour ouvrir le détail, puis sélectionnez le code trajet approprié :</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">T1 à T17</Badge>
                      <Badge variant="outline">T31</Badge>
                      <Badge variant="outline">T35</Badge>
                      <Badge variant="outline">GD - Grand déplacement</Badge>
                      <Badge variant="outline">T Perso</Badge>
                      <Badge variant="outline">Aucun</Badge>
                    </div>
                  </DocStep>
                </div>
                <DocNote type="warning">
                  L'export Excel n'est pas possible tant que des absences restent non qualifiées ou que des trajets sont marqués "À compléter".
                </DocNote>
              </DocSubsection>

              <DocSubsection id="rh-export" title="Export Excel">
                <DocImage 
                  src={docExportExcel} 
                  alt="Export Excel pour la paie" 
                  caption="Bouton d'export et aperçu du fichier Excel généré"
                />
                <div className="space-y-4">
                  <DocStep number={1} title="Vérifier les données">
                    <p>Assurez-vous que toutes les absences sont qualifiées (aucun badge orange).</p>
                  </DocStep>
                  <DocStep number={2} title="Lancer l'export">
                    <p>
                      Cliquez sur <strong>"Exporter Excel"</strong>.
                      Le fichier est généré avec toutes les données pour le logiciel de paie.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Format du fichier">
                    <p>Le fichier contient une ligne par salarié avec toutes les colonnes requises pour la paie.</p>
                  </DocStep>
                </div>
              </DocSubsection>

              <DocSubsection id="rh-interimaires" title="Export intérimaires">
                <div className="space-y-4">
                  <DocStep number={1} title="Accéder à l'export">
                    <p>Cliquez sur <strong>"Export Intérimaires"</strong>.</p>
                  </DocStep>
                  <DocStep number={2} title="Sélectionner l'agence">
                    <p>Choisissez l'agence d'intérim concernée dans la liste.</p>
                  </DocStep>
                  <DocStep number={3} title="Générer le document">
                    <p>
                      Le PDF ou Excel est généré avec les heures des intérimaires
                      de cette agence pour la période.
                    </p>
                  </DocStep>
                </div>
              </DocSubsection>

              <DocSubsection id="rh-cloture" title="Clôture de période">
                <div className="space-y-4">
                  <DocStep number={1} title="Sélectionner la période">
                    <p>Choisissez le mois à clôturer.</p>
                  </DocStep>
                  <DocStep number={2} title="Vérifier les données">
                    <p>Assurez-vous que toutes les fiches sont validées et les absences qualifiées.</p>
                  </DocStep>
                  <DocStep number={3} title="Clôturer">
                    <p>
                      Cliquez sur <strong>"Clôturer la période"</strong> et confirmez.
                    </p>
                  </DocStep>
                </div>
                <DocNote type="warning">
                  <strong>Action irréversible :</strong> Une fois clôturée, la période ne peut plus être modifiée.
                  Les fiches passent en statut "CLOTURE".
                </DocNote>
              </DocSubsection>
            </DocSection>

            <Separator className="my-12" />

            {/* ============ GUIDE ADMIN ============ */}
            <DocSection id="admin" title="Guide Administrateur" icon={<Settings className="h-5 w-5" />}>
              <DocSubsection id="admin-dashboard" title="Dashboard">
                <p className="text-muted-foreground mb-4">
                  Le dashboard offre une vue temps réel de l'activité de la semaine.
                </p>
                <DocImage 
                  src={docDashboard} 
                  alt="Dashboard administrateur" 
                  caption="Vue d'ensemble du dashboard avec statistiques et indicateurs clés"
                />
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Informations affichées :</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Nombre de fiches par statut
                      </li>
                      <li className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        Alertes et rappels en attente
                      </li>
                      <li className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Activité des utilisateurs
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </DocSubsection>

              <DocSubsection id="admin-utilisateurs" title="Gestion des utilisateurs">
                <div className="space-y-4">
                  <DocStep number={1} title="Inviter un utilisateur">
                    <p>
                      Cliquez sur <strong>"Inviter"</strong>, renseignez l'email et sélectionnez le rôle :
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge>Admin</Badge>
                      <Badge>RH</Badge>
                      <Badge>Conducteur</Badge>
                      <Badge>Chef</Badge>
                    </div>
                  </DocStep>
                  <DocStep number={2} title="Modifier les rôles">
                    <p>
                      Cliquez sur un utilisateur pour modifier son rôle ou ses informations.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Désactiver un utilisateur">
                    <p>
                      Les utilisateurs désactivés ne peuvent plus se connecter
                      mais leurs données sont conservées.
                    </p>
                  </DocStep>
                </div>
              </DocSubsection>

              <DocSubsection id="admin-chantiers" title="Gestion des chantiers">
                <div className="space-y-4">
                  <DocStep number={1} title="Créer un chantier">
                    <p>Renseignez les informations :</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Nom et code chantier</li>
                      <li>Client</li>
                      <li>Ville et adresse</li>
                      <li>Chef de chantier responsable</li>
                      <li>Conducteur de travaux</li>
                    </ul>
                  </DocStep>
                  <DocStep number={2} title="Fiche chantier détaillée">
                    <p>Chaque chantier dispose d'une fiche complète avec :</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong>Planning Gantt</strong> : visualisation des tâches</li>
                      <li><strong>Todo</strong> : liste des actions à faire</li>
                      <li><strong>Fichiers</strong> : documents du chantier</li>
                      <li><strong>Rentabilité</strong> : suivi des heures et coûts</li>
                    </ul>
                  </DocStep>
                </div>
              </DocSubsection>

              <DocSubsection id="admin-referentiels" title="Référentiels">
                <p className="text-muted-foreground mb-4">
                  Les onglets de référentiels permettent de gérer les données de base.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Personnel
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Conducteurs</li>
                        <li>• Chefs de chantier</li>
                        <li>• Maçons</li>
                        <li>• Grutiers</li>
                        <li>• Finisseurs</li>
                        <li>• Intérimaires</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Véhicules
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Liste des véhicules avec immatriculation, marque et modèle.
                        Utilisés dans les fiches de trajet.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </DocSubsection>

              <DocSubsection id="admin-rappels" title="Rappels automatiques">
                <p className="text-muted-foreground mb-4">
                  Le système envoie des rappels par email automatiquement.
                </p>
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Rappels programmés :</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-amber-500" />
                        <strong>Lundi 8h :</strong> Rappel aux chefs de saisir les heures
                      </li>
                      <li className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-amber-500" />
                        <strong>Vendredi 12h :</strong> Rappel aux chefs de transmettre
                      </li>
                      <li className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-blue-500" />
                        <strong>Quotidien :</strong> Rappel aux conducteurs pour validation
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                <p className="text-muted-foreground mt-4">
                  L'historique des rappels est consultable dans l'onglet "Rappels".
                </p>
              </DocSubsection>
            </DocSection>

            <Separator className="my-12" />

            {/* ============ FONCTIONNALITÉS COMMUNES ============ */}
            <DocSection id="commun" title="Fonctionnalités communes" icon={<Users className="h-5 w-5" />}>
              <DocSubsection id="commun-messagerie" title="Messagerie interne">
                <div className="space-y-4">
                  <DocStep number={1} title="Accéder à la messagerie">
                    <p>
                      Cliquez sur l'icône de conversation dans le header.
                      Un badge rouge indique les messages non lus.
                    </p>
                  </DocStep>
                  <DocStep number={2} title="Conversations par chantier">
                    <p>
                      Chaque chantier dispose de sa propre conversation.
                      Tous les membres du chantier peuvent y participer.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Envoyer un message">
                    <p>Tapez votre message et appuyez sur Entrée ou cliquez sur Envoyer.</p>
                  </DocStep>
                </div>
              </DocSubsection>

              <DocSubsection id="commun-meteo" title="Météo du chantier">
                <p className="text-muted-foreground mb-4">
                  Si le chantier a une ville renseignée, un bouton météo apparaît dans le header.
                </p>
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Fonctionnalités météo :</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CloudSun className="h-4 w-4 text-primary" />
                        Prévisions à 7 jours
                      </li>
                      <li className="flex items-center gap-2">
                        <CloudSun className="h-4 w-4 text-primary" />
                        Radar pluie interactif
                      </li>
                      <li className="flex items-center gap-2">
                        <CloudSun className="h-4 w-4 text-primary" />
                        Alertes météo
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </DocSubsection>

              <DocSubsection id="commun-theme" title="Mode sombre">
                <p className="text-muted-foreground">
                  Cliquez sur l'icône <Moon className="h-4 w-4 inline" /> dans la barre de navigation
                  pour basculer entre le mode clair et le mode sombre.
                  Votre préférence est sauvegardée.
                </p>
              </DocSubsection>

              <DocSubsection id="commun-pwa" title="Application mobile (PWA)">
                <p className="text-muted-foreground mb-4">
                  DIVA RH peut être installée sur votre téléphone ou tablette comme une application native.
                </p>
                <div className="space-y-4">
                  <DocStep number={1} title="Installer l'application">
                    <p>
                      Une bannière s'affiche automatiquement proposant l'installation.
                      Vous pouvez aussi utiliser le menu du navigateur {">"} "Ajouter à l'écran d'accueil".
                    </p>
                  </DocStep>
                  <DocStep number={2} title="Mode hors-ligne">
                    <p>
                      Une fois installée, l'application peut être consultée même sans connexion internet.
                      Les modifications seront synchronisées au retour de la connexion.
                    </p>
                  </DocStep>
                </div>
                <DocNote type="info">
                  L'installation PWA offre une meilleure expérience sur mobile avec un accès rapide
                  depuis l'écran d'accueil.
                </DocNote>
              </DocSubsection>
            </DocSection>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-border text-center">
              <p className="text-muted-foreground text-sm">
                Documentation DIVA RH • Version 1.0 • {new Date().getFullYear()}
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                Pour toute question, contactez votre administrateur.
              </p>
            </div>
          </div>
        </main>
      </div>
    </PageLayout>
  );
};

export default Documentation;
