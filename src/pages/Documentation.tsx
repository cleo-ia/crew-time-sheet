import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AppNav } from "@/components/navigation/AppNav";
import { PageLayout } from "@/components/layout/PageLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
  Sparkles,
  ChevronUp,
  Search,
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
import docExportInterimaire from "@/assets/doc-export-interimaire.png";
import docCloturePeriode from "@/assets/doc-cloture-periode.png";
import docGestionUtilisateurs from "@/assets/doc-gestion-utilisateurs.png";

// Types
interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  color?: string;
  subsections?: { id: string; title: string }[];
}

// Sections de navigation avec couleurs thématiques
const sections: Section[] = [
  {
    id: "introduction",
    title: "Introduction",
    icon: <BookOpen className="h-4 w-4" />,
    color: "primary",
    subsections: [
      { id: "presentation", title: "Présentation" },
      { id: "flux-travail", title: "Flux de travail" },
      { id: "concepts-cles", title: "Concepts clés" },
    ],
  },
  {
    id: "premiere-connexion",
    title: "Première connexion",
    icon: <UserPlus className="h-4 w-4" />,
    color: "primary",
    subsections: [
      { id: "premiere-activer", title: "Activer son compte" },
      { id: "premiere-se-connecter", title: "Se connecter" },
      { id: "premiere-ios", title: "Installer sur iPhone" },
      { id: "premiere-android", title: "Installer sur Android" },
    ],
  },
  {
    id: "commun",
    title: "Fonctionnalités communes",
    icon: <Users className="h-4 w-4" />,
    color: "primary",
    subsections: [
      { id: "commun-messagerie", title: "Messagerie interne" },
      { id: "commun-meteo", title: "Météo du chantier" },
      { id: "commun-theme", title: "Mode sombre" },
      { id: "commun-pwa", title: "Application mobile (PWA)" },
    ],
  },
  {
    id: "chef",
    title: "Guide Chef de chantier",
    icon: <HardHat className="h-4 w-4" />,
    color: "chef",
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
    color: "conducteur",
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
    color: "rh",
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
    color: "admin",
    subsections: [
      { id: "admin-dashboard", title: "Dashboard" },
      { id: "admin-utilisateurs", title: "Gestion des utilisateurs" },
      { id: "admin-chantiers", title: "Gestion des chantiers" },
      { id: "admin-referentiels", title: "Référentiels" },
      { id: "admin-rappels", title: "Rappels automatiques" },
    ],
  },
];

// Hook pour les animations au scroll
const useScrollAnimation = () => {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const sections = document.querySelectorAll("[data-animate]");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return visibleSections;
};

// Composants de documentation améliorés
const DocSection = ({
  id,
  title,
  icon,
  children,
  isVisible,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isVisible?: boolean;
}) => (
  <section
    id={id}
    data-animate
    className={cn(
      "scroll-mt-20 mb-16 opacity-0",
      isVisible && "animate-fade-in-up opacity-100"
    )}
  >
    <div className="flex items-center gap-4 mb-8">
      {icon && (
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-sm">
          {icon}
        </div>
      )}
      <h2 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
    </div>
    <div className="space-y-8">{children}</div>
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
  <div id={id} className="scroll-mt-20 mb-10">
    <h3 className="text-xl font-semibold text-foreground mb-5 flex items-center gap-3">
      <div className="w-1.5 h-6 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
      {title}
    </h3>
    <div className="pl-5 border-l-2 border-primary/20 space-y-5 hover:border-primary/40 transition-colors duration-300">
      {children}
    </div>
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
  <div className="flex gap-4 group">
    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
      {number}
    </div>
    <div className="flex-1 pt-1">
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
      className: "doc-note-info",
      icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
      title: "Conseil",
    },
    warning: {
      className: "doc-note-warning",
      icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
      title: "Attention",
    },
    success: {
      className: "doc-note-success",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      title: "Bonne pratique",
    },
  };

  const style = styles[type];

  return (
    <div className={cn("p-5 rounded-xl border-0 shadow-sm", style.className)}>
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
          {style.icon}
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">{style.title}</p>
          <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
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
  <figure className="my-8 group">
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30 cursor-zoom-in doc-image-zoom shadow-md hover:shadow-xl">
          <img
            src={src}
            alt={alt}
            className={`w-full h-auto object-contain ${fullWidth ? 'max-h-[500px]' : 'max-h-96'}`}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
            <div className="bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
              <Search className="h-4 w-4" />
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
      <figcaption className="mt-3 text-center text-sm text-muted-foreground italic">
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
  <div className="my-8 p-8 border-2 border-dashed border-primary/30 rounded-xl bg-gradient-to-br from-primary/5 to-transparent">
    <div className="flex items-center gap-4 text-primary">
      <div className="p-3 rounded-xl bg-primary/10">
        <Camera className="h-6 w-6" />
      </div>
      <div>
        <p className="font-medium">Capture d'écran à ajouter</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  </div>
);

// FlowDiagram amélioré avec couleurs thématiques
const FlowDiagram = () => (
  <div className="doc-flow-gradient p-8 rounded-2xl shadow-inner border border-border/50">
    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
      <Badge 
        variant="outline" 
        className="py-3 px-5 text-sm font-medium doc-badge-chef shadow-sm hover:shadow-md transition-shadow"
      >
        <HardHat className="h-4 w-4 mr-2" />
        Chef de chantier
      </Badge>
      <ArrowRight className="h-5 w-5 text-primary/60 animate-flow-arrow hidden sm:block" />
      <Badge 
        variant="outline" 
        className="py-3 px-5 text-sm font-medium doc-badge-chef shadow-sm hover:shadow-md transition-shadow"
      >
        <PenTool className="h-4 w-4 mr-2" />
        Saisie & Signatures
      </Badge>
      <ArrowRight className="h-5 w-5 text-primary/60 animate-flow-arrow hidden sm:block" />
      <Badge 
        variant="outline" 
        className="py-3 px-5 text-sm font-medium doc-badge-conducteur shadow-sm hover:shadow-md transition-shadow"
      >
        <FileCheck className="h-4 w-4 mr-2" />
        Conducteur
      </Badge>
      <ArrowRight className="h-5 w-5 text-primary/60 animate-flow-arrow hidden sm:block" />
      <Badge 
        variant="outline" 
        className="py-3 px-5 text-sm font-medium doc-badge-conducteur shadow-sm hover:shadow-md transition-shadow"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Validation
      </Badge>
      <ArrowRight className="h-5 w-5 text-primary/60 animate-flow-arrow hidden sm:block" />
      <Badge 
        variant="outline" 
        className="py-3 px-5 text-sm font-medium doc-badge-rh shadow-sm hover:shadow-md transition-shadow"
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Service RH
      </Badge>
      <ArrowRight className="h-5 w-5 text-primary/60 animate-flow-arrow hidden sm:block" />
      <Badge 
        variant="outline" 
        className="py-3 px-5 text-sm font-medium doc-badge-rh shadow-sm hover:shadow-md transition-shadow"
      >
        <Download className="h-4 w-4 mr-2" />
        Export Paie
      </Badge>
    </div>
  </div>
);

// Gradient separator
const GradientSeparator = () => (
  <div className="my-16 flex items-center justify-center">
    <div className="doc-separator-gradient w-full max-w-md rounded-full" />
  </div>
);

// Sidebar de navigation améliorée
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
          "fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border shadow-xl transform transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:transform-none lg:z-auto lg:shadow-lg",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border lg:hidden">
          <span className="font-semibold">Navigation</span>
          <Button variant="ghost" size="icon" onClick={onMobileClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Logo/Titre sidebar desktop */}
        <div className="hidden lg:flex items-center gap-3 p-5 border-b border-border bg-muted/30">
          <div className="p-2 rounded-lg bg-primary/10 doc-icon-glow">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold text-foreground">Documentation</span>
        </div>

        <ScrollArea className="h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)]">
          <nav className="p-4 space-y-2">
            {sections.map((section, index) => (
              <div 
                key={section.id}
                className="animate-slide-in-left opacity-0"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
              >
                <button
                  onClick={() => {
                    onSectionClick(section.id);
                    onMobileClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
                    activeSection === section.id || section.subsections?.some(s => s.id === activeSection)
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-muted hover:shadow-sm"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    activeSection === section.id || section.subsections?.some(s => s.id === activeSection)
                      ? "bg-white/20"
                      : "bg-primary/10"
                  )}>
                    {section.icon}
                  </div>
                  <span className="font-medium text-sm">{section.title}</span>
                </button>

                {section.subsections && (
                  <div className="ml-4 mt-2 space-y-1 border-l-2 border-primary/20 pl-4">
                    {section.subsections.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          onSectionClick(sub.id);
                          onMobileClose();
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-lg transition-all duration-200 relative",
                          activeSection === sub.id
                            ? "text-primary font-medium bg-primary/10 doc-sidebar-active"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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

// Bouton retour en haut
const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 z-50 rounded-full shadow-lg transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  );
};

// Page principale
const Documentation = () => {
  const [activeSection, setActiveSection] = useState("introduction");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const visibleSections = useScrollAnimation();

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
            {/* Hero Header amélioré */}
            <div className="doc-hero-gradient -mx-6 lg:-mx-8 px-6 lg:px-8 pt-8 pb-12 mb-12 rounded-b-3xl">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 animate-fade-in-up">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl doc-icon-glow">
                  <BookOpen className="h-10 w-10" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold doc-gradient-text">
                      Documentation DIVA RH
                    </h1>
                    <Badge variant="secondary" className="hidden sm:flex gap-1 items-center">
                      <Sparkles className="h-3 w-3" />
                      v1.0
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-lg">
                    Guide complet pour la gestion des heures et fiches de chantier
                  </p>
                </div>
              </div>
            </div>

            {/* ============ INTRODUCTION ============ */}
            <DocSection 
              id="introduction" 
              title="Introduction" 
              icon={<BookOpen className="h-5 w-5" />}
              isVisible={visibleSections.has("introduction")}
            >
              <DocSubsection id="presentation" title="Présentation de DIVA RH">
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">DIVA RH</strong> est une application de gestion des heures et des fiches de chantier
                  conçue pour le secteur du BTP. Elle permet de suivre le temps de travail des équipes,
                  de collecter les signatures, et de transmettre les données au service RH pour l'export paie.
                </p>
                <Card className="mt-6 doc-card-hover doc-card-accent overflow-hidden">
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Fonctionnalités principales
                    </h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        Saisie des heures par les chefs de chantier
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        Collecte des signatures numériques
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        Validation par les conducteurs de travaux
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        Export Excel pour la paie
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        Gestion des intérimaires
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </DocSubsection>

              <DocSubsection id="flux-travail" title="Flux de travail global">
                <p className="text-muted-foreground mb-6">
                  Le processus suit un flux linéaire du terrain vers le service RH :
                </p>
                <FlowDiagram />
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Card className="doc-card-hover">
                    <CardContent className="p-5">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Rythme hebdomadaire
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Les fiches sont saisies chaque semaine du lundi au vendredi.
                        La transmission au conducteur se fait généralement le vendredi.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="doc-card-hover">
                    <CardContent className="p-5">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
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
                  <Card className="doc-card-hover">
                    <CardContent className="p-5">
                      <h4 className="font-semibold mb-2">Semaine</h4>
                      <p className="text-sm text-muted-foreground">
                        Identifiée par son numéro (ex: S01, S02...). Format : <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">YYYY-WXX</code>.
                        La semaine courante et la suivante sont accessibles pour la saisie.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="doc-card-hover">
                    <CardContent className="p-5">
                      <h4 className="font-semibold mb-2">Fiche</h4>
                      <p className="text-sm text-muted-foreground">
                        Document hebdomadaire regroupant les heures d'un salarié sur un chantier.
                        Contient : heures normales, absences, paniers, trajets.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="doc-card-hover">
                    <CardContent className="p-5">
                      <h4 className="font-semibold mb-2">Statuts de fiche</h4>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary" className="font-mono text-xs">BROUILLON</Badge>
                        <Badge variant="secondary" className="font-mono text-xs">EN_SIGNATURE</Badge>
                        <Badge variant="secondary" className="font-mono text-xs">VALIDE_CHEF</Badge>
                        <Badge variant="secondary" className="font-mono text-xs">VALIDE_CONDUCTEUR</Badge>
                        <Badge variant="secondary" className="font-mono text-xs">ENVOYE_RH</Badge>
                        <Badge variant="secondary" className="font-mono text-xs">CLOTURE</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </DocSubsection>
            </DocSection>

            <GradientSeparator />

            {/* ============ PREMIÈRE CONNEXION ============ */}
            <DocSection 
              id="premiere-connexion" 
              title="Première connexion" 
              icon={<UserPlus className="h-5 w-5" />}
              isVisible={visibleSections.has("premiere-connexion")}
            >
              <DocSubsection id="premiere-activer" title="Activer son compte">
                <p className="text-muted-foreground mb-5">
                  Pour utiliser DIVA RH, vous devez d'abord être invité par un administrateur de votre entreprise.
                </p>
                <div className="space-y-5">
                  <DocStep number={1} title="Réception de l'invitation">
                    <p>
                      Vous recevez un email <strong>envoyé par Supabase</strong> contenant un lien d'activation.
                      Cet email est envoyé à l'adresse professionnelle renseignée par l'administrateur.
                    </p>
                  </DocStep>
                  <DocStep number={2} title="Cliquer sur le lien">
                    <p>
                      Cliquez sur le bouton <strong>"Activer mon compte"</strong> dans l'email.
                      Vous êtes redirigé vers la page de création de mot de passe.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Définir votre mot de passe">
                    <p>
                      Choisissez un mot de passe sécurisé d'au moins <strong>6 caractères</strong>.
                      Confirmez-le en le saisissant une seconde fois.
                    </p>
                  </DocStep>
                  <DocStep number={4} title="Compte activé">
                    <p>
                      Une fois le mot de passe validé, votre compte est actif.
                      Vous pouvez maintenant vous connecter à l'application.
                    </p>
                  </DocStep>
                </div>
                <DocNote type="info">
                  Votre adresse email devient votre identifiant de connexion.
                  Conservez-la précieusement.
                </DocNote>
                <DocNote type="warning">
                  Le lien d'activation expire après <strong>7 jours</strong>.
                  Si le lien a expiré, contactez votre administrateur pour recevoir une nouvelle invitation.
                </DocNote>
              </DocSubsection>

              <DocSubsection id="premiere-se-connecter" title="Se connecter">
                <p className="text-muted-foreground mb-5">
                  Une fois votre compte activé, vous pouvez accéder à l'application depuis n'importe quel appareil.
                </p>
                <div className="space-y-5">
                  <DocStep number={1} title="Sélectionner votre entreprise">
                    <p>
                      Sur la page de connexion, un carrousel affiche les entreprises disponibles.
                      <strong> Faites glisser</strong> pour sélectionner votre entreprise (logo et nom).
                    </p>
                  </DocStep>
                  <DocStep number={2} title="Saisir vos identifiants">
                    <p>
                      Entrez votre <strong>email professionnel</strong> et votre <strong>mot de passe</strong>.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Se connecter">
                    <p>
                      Cliquez sur <strong>"Connexion"</strong>. Vous êtes redirigé vers votre espace
                      selon votre rôle (Chef, Conducteur, RH, Admin).
                    </p>
                  </DocStep>
                </div>
                <Card className="doc-card-hover mt-6">
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary" />
                      Options de connexion alternatives
                    </h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-foreground">Lien magique</strong> : Recevez un lien de connexion par email sans avoir à saisir de mot de passe.
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-foreground">Mot de passe oublié</strong> : Cliquez sur "Mot de passe oublié" pour recevoir un email de réinitialisation.
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                <DocNote type="warning">
                  Assurez-vous de sélectionner la bonne entreprise avant de vous connecter.
                  Un même email peut avoir des comptes sur différentes entreprises.
                </DocNote>
              </DocSubsection>

              <DocSubsection id="premiere-ios" title="Installer sur iPhone (iOS)">
                <p className="text-muted-foreground mb-5">
                  DIVA RH peut être installée comme une vraie application sur votre iPhone ou iPad.
                  L'installation se fait uniquement via <strong>Safari</strong>.
                </p>
                <DocNote type="warning">
                  <strong>Safari est obligatoire</strong> pour installer l'application sur iOS.
                  L'option n'apparaît pas dans Chrome ou Firefox.
                </DocNote>
                <div className="space-y-5 mt-6">
                  <DocStep number={1} title="Ouvrir Safari">
                    <p>
                      Ouvrez <strong>Safari</strong> et accédez à l'application DIVA RH à l'adresse habituelle.
                    </p>
                  </DocStep>
                  <DocStep number={2} title="Appuyer sur 'Partager'">
                    <p>
                      Appuyez sur l'icône <strong>Partager</strong> en bas de l'écran
                      (carré avec une flèche vers le haut).
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Sélectionner 'Sur l'écran d'accueil'">
                    <p>
                      Faites défiler les options et appuyez sur <strong>"Sur l'écran d'accueil"</strong>.
                      Cette option peut être plus bas dans la liste, faites défiler si nécessaire.
                    </p>
                  </DocStep>
                  <DocStep number={4} title="Confirmer l'installation">
                    <p>
                      Donnez un nom à l'application (par défaut "DIVA RH") et appuyez sur <strong>"Ajouter"</strong>.
                      L'icône apparaît sur votre écran d'accueil.
                    </p>
                  </DocStep>
                </div>
                <DocNote type="success">
                  Une fois installée, l'application s'ouvre en plein écran comme une vraie app,
                  sans la barre d'adresse Safari. Elle fonctionne même hors connexion.
                </DocNote>
              </DocSubsection>

              <DocSubsection id="premiere-android" title="Installer sur Android">
                <p className="text-muted-foreground mb-5">
                  Sur Android, l'installation est encore plus simple. Chrome propose automatiquement
                  l'installation, ou vous pouvez la déclencher manuellement.
                </p>
                <div className="space-y-5">
                  <DocStep number={1} title="Ouvrir Chrome">
                    <p>
                      Ouvrez <strong>Chrome</strong> et accédez à l'application DIVA RH.
                    </p>
                  </DocStep>
                  <DocStep number={2} title="Méthode automatique (recommandée)">
                    <p>
                      Une bannière <strong>"Installer l'application"</strong> peut apparaître en bas de l'écran.
                      Si c'est le cas, appuyez simplement sur <strong>"Installer"</strong>.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Méthode manuelle">
                    <p>
                      Si la bannière n'apparaît pas, appuyez sur les <strong>3 points verticaux</strong> (menu)
                      en haut à droite de Chrome, puis sélectionnez <strong>"Installer l'application"</strong>
                      ou <strong>"Ajouter à l'écran d'accueil"</strong>.
                    </p>
                  </DocStep>
                  <DocStep number={4} title="Confirmer">
                    <p>
                      Appuyez sur <strong>"Installer"</strong> dans la popup de confirmation.
                      L'application s'installe et son icône apparaît sur l'écran d'accueil.
                    </p>
                  </DocStep>
                </div>
                <Card className="doc-card-hover mt-6">
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-primary" />
                      Avantages de l'installation
                    </h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        Accès instantané depuis l'écran d'accueil
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        Mode plein écran (sans barre d'adresse)
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        Fonctionne hors connexion (cache local)
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        Pas besoin de passer par l'App Store ou Play Store
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                <DocNote type="info">
                  Vous pouvez continuer à utiliser DIVA RH directement dans votre navigateur
                  si vous préférez ne pas installer l'application.
                </DocNote>
              </DocSubsection>
            </DocSection>

            <GradientSeparator />

            {/* ============ FONCTIONNALITÉS COMMUNES ============ */}
            <DocSection 
              id="commun" 
              title="Fonctionnalités communes" 
              icon={<Users className="h-5 w-5" />}
              isVisible={visibleSections.has("commun")}
            >
              <DocSubsection id="commun-messagerie" title="Messagerie interne">
                <div className="space-y-5">
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
                <p className="text-muted-foreground mb-5">
                  Si le chantier a une ville renseignée, un bouton météo apparaît dans le header.
                </p>
                <Card className="doc-card-hover">
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-3">Fonctionnalités météo :</h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-3">
                        <CloudSun className="h-5 w-5 text-primary" />
                        Prévisions à 7 jours
                      </li>
                      <li className="flex items-center gap-3">
                        <CloudSun className="h-5 w-5 text-primary" />
                        Radar pluie interactif
                      </li>
                      <li className="flex items-center gap-3">
                        <CloudSun className="h-5 w-5 text-primary" />
                        Alertes météo
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </DocSubsection>

              <DocSubsection id="commun-theme" title="Mode sombre">
                <p className="text-muted-foreground">
                  Cliquez sur l'icône <Moon className="h-4 w-4 inline mx-1" /> dans la barre de navigation
                  pour basculer entre le mode clair et le mode sombre.
                  Votre préférence est sauvegardée.
                </p>
              </DocSubsection>

              <DocSubsection id="commun-pwa" title="Application mobile (PWA)">
                <p className="text-muted-foreground mb-5">
                  DIVA RH peut être installée sur votre téléphone ou tablette comme une application native.
                </p>
                <div className="space-y-5">
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

            <GradientSeparator />

            {/* ============ GUIDE CHEF ============ */}
            <DocSection 
              id="chef" 
              title="Guide Chef de chantier" 
              icon={<HardHat className="h-5 w-5" />}
              isVisible={visibleSections.has("chef")}
            >
              <DocSubsection id="chef-connexion" title="Connexion et sélection">
                <div className="space-y-5">
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
                <div className="space-y-5">
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
                <div className="mt-5 space-y-5">
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
                <p className="text-muted-foreground mb-5">
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
                <div className="space-y-5">
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
                <p className="text-muted-foreground mb-5">
                  La fiche de trajet doit être remplie <strong>complètement</strong> avant de passer à la signature.
                </p>
                <DocImage 
                  src={docFicheTrajet} 
                  alt="Interface fiche de trajet" 
                  caption="Formulaire de saisie des trajets par jour"
                />
                <div className="space-y-5">
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
                <DocNote type="info">
                  Utilisez le bouton <strong>"Copier semaine précédente"</strong> si les trajets sont identiques.
                </DocNote>
              </DocSubsection>

              <DocSubsection id="chef-ratio" title="Ratio global">
                <p className="text-muted-foreground mb-5">
                  Le ratio global permet de suivre les quantités produites par l'équipe sur la semaine.
                </p>
                <DocImage 
                  src={docRatioGlobal} 
                  alt="Interface du ratio global" 
                  caption="Saisie des ratios : m³ béton, m² coffrage, ml voile, et observations"
                />
                <div className="space-y-5">
                  <DocStep number={1} title="Accéder aux ratios">
                    <p>Cliquez sur le bouton <strong>"Ratio"</strong> pour ouvrir le panneau de saisie.</p>
                  </DocStep>
                  <DocStep number={2} title="Saisir les quantités journalières">
                    <p>Pour chaque jour travaillé, renseignez les quantités produites et les observations.</p>
                  </DocStep>
                </div>
              </DocSubsection>

              <DocSubsection id="chef-signature" title="Collecte des signatures">
                <DocImage 
                  src={docCollecteSignaturesBtn} 
                  alt="Bouton de collecte des signatures" 
                  caption="Le bouton 'Collecte des signatures' dans le menu de navigation mobile"
                />
                <div className="space-y-5 mt-6">
                  <DocStep number={1} title="Ouvrir la collecte">
                    <p>Cliquez sur <strong>"Collecte des signatures"</strong> dans la navigation.</p>
                  </DocStep>
                  <DocStep number={2} title="Faire signer chaque salarié">
                    <p>
                      Passez le téléphone à chaque salarié pour qu'il signe sa fiche.
                      Une fois signé, le statut passe à "VALIDE_CHEF".
                    </p>
                  </DocStep>
                </div>
                <DocImage 
                  src={docSignaturePad} 
                  alt="Interface de signature" 
                  caption="Zone de signature tactile"
                />
                <DocNote type="warning">
                  La fiche de trajet doit être complète avant la signature.
                  Le bouton de signature reste désactivé tant qu'il manque des informations.
                </DocNote>
              </DocSubsection>

              <DocSubsection id="chef-historique" title="Historique">
                <p className="text-muted-foreground">
                  L'onglet "Historique" permet de consulter les fiches des semaines précédentes.
                  Les fiches déjà transmises au conducteur sont en lecture seule.
                </p>
              </DocSubsection>
            </DocSection>

            <GradientSeparator />

            {/* ============ GUIDE CONDUCTEUR ============ */}
            <DocSection 
              id="conducteur" 
              title="Guide Conducteur" 
              icon={<FileCheck className="h-5 w-5" />}
              isVisible={visibleSections.has("conducteur")}
            >
              <DocSubsection id="conducteur-finisseurs" title="Gestion des finisseurs">
                <DocImage 
                  src={docGestionFinisseurs} 
                  alt="Interface de gestion des finisseurs" 
                  caption="Planification des finisseurs par jour avec affectation sur les chantiers"
                  fullWidth
                />
                <div className="space-y-5 mt-6">
                  <DocStep number={1} title="Accéder à la gestion">
                    <p>L'onglet <strong>"Finisseurs"</strong> est disponible dans votre espace conducteur.</p>
                  </DocStep>
                  <DocStep number={2} title="Affecter un finisseur">
                    <p>
                      Pour chaque jour, affectez les finisseurs aux chantiers.
                      Un finisseur peut être sur différents chantiers selon les jours.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Renseigner les transports">
                    <p>
                      Pour chaque finisseur affecté, indiquez le conducteur matin,
                      conducteur soir et le véhicule utilisé.
                    </p>
                  </DocStep>
                </div>
                <DocNote type="success">
                  Utilisez le bouton <strong>"Copier semaine précédente"</strong> pour reprendre
                  les affectations de la semaine passée.
                </DocNote>
              </DocSubsection>

              <DocSubsection id="conducteur-validation" title="Validation des fiches">
                <p className="text-muted-foreground mb-5">
                  Vous recevez les fiches signées par les chefs de chantier pour validation.
                </p>
                <DocImage 
                  src={docValidation} 
                  alt="Interface de validation conducteur" 
                  caption="Liste des fiches à valider avec les signatures des salariés"
                />
                <div className="space-y-5">
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

            <GradientSeparator />

            {/* ============ GUIDE RH ============ */}
            <DocSection 
              id="rh" 
              title="Guide Service RH" 
              icon={<FileSpreadsheet className="h-5 w-5" />}
              isVisible={visibleSections.has("rh")}
            >
              <DocSubsection id="rh-filtres" title="Filtres et navigation">
                <DocImage src={docRhFiltres} alt="Interface de filtrage RH" caption="Vue d'ensemble de la page Consultation RH avec les filtres" fullWidth />
                <div className="space-y-5 mt-6">
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
                <p className="text-muted-foreground mb-5">
                  Cette vue affiche un récapitulatif par employé sur la période sélectionnée.
                </p>
                <DocImage
                  src={docRhConsolide}
                  alt="Vue consolidée par salarié avec le tableau récapitulatif"
                  caption="Vue consolidée par salarié avec le tableau récapitulatif"
                  fullWidth={true}
                />
                <Card className="doc-card-hover mt-6">
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-3">Colonnes affichées :</h4>
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
                <p className="text-muted-foreground mt-5">
                  Cliquez sur un employé pour voir le détail semaine par semaine.
                </p>
              </DocSubsection>

              <DocSubsection id="rh-preexport" title="Pré-export : qualification des absences et trajets">
                <p className="text-muted-foreground mb-5">
                  Avant l'export, vous devez qualifier toutes les absences et renseigner les trajets manquants.
                </p>
                <DocImage 
                  src={docPreExportDetail} 
                  alt="Détail jour par jour avec absences et trajets à qualifier" 
                  caption="Vue détaillée avec colonnes Type d'absence et Trajet à compléter"
                />
                <div className="space-y-5">
                  <DocStep number={1} title="Identifier les absences non qualifiées">
                    <p>Un badge orange s'affiche <strong>à côté du nom de l'employé</strong> sur les fiches contenant des absences à qualifier.</p>
                  </DocStep>
                  <DocStep number={2} title="Qualifier l'absence">
                    <p>Cliquez sur <strong>l'icône œil</strong> dans la colonne "Action" pour ouvrir le détail de la fiche, puis sélectionnez le type d'absence :</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline">CP - Congés payés</Badge>
                      <Badge variant="outline">RTT</Badge>
                      <Badge variant="outline">AM - Maladie</Badge>
                      <Badge variant="outline">AT - Accident du travail</Badge>
                      <Badge variant="outline">ABS - Absence injustifiée</Badge>
                    </div>
                  </DocStep>
                  <DocStep number={3} title="Renseigner les trajets manquants">
                    <p>Les trajets marqués <strong>"À compléter"</strong> sont <strong>encadrés en rouge dans la colonne Trajet</strong>. Cliquez sur <strong>l'icône œil</strong> dans la colonne "Action" pour ouvrir le détail, puis sélectionnez le code trajet approprié :</p>
                    <div className="flex flex-wrap gap-2 mt-3">
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
                <div className="space-y-5">
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
                <DocImage
                  src={docExportInterimaire}
                  alt="Export par agence d'intérim"
                  caption="Export par agence d'intérim avec le nombre d'intérimaires par agence"
                />
                <div className="space-y-5">
                  <DocStep number={1} title="Accéder à l'export">
                    <p>Cliquez sur le bouton <strong>"Export Intérimaires"</strong> situé en haut à droite de la page.</p>
                  </DocStep>
                  <DocStep number={2} title="Sélectionner l'agence">
                    <p>Choisissez l'agence d'intérim concernée dans la liste.</p>
                  </DocStep>
                  <DocStep number={3} title="Générer le document">
                    <p>
                      Le PDF est généré avec les heures des intérimaires
                      de cette agence pour la période.
                    </p>
                  </DocStep>
                </div>
              </DocSubsection>

              <DocSubsection id="rh-cloture" title="Clôture de période">
                <DocImage
                  src={docCloturePeriode}
                  alt="Interface de clôture de période"
                  caption="Vue consolidée avec filtres et bouton de clôture"
                />
                <div className="space-y-5">
                  <DocStep number={1} title="Sélectionner la période">
                    <p>Utilisez le filtre <strong>"Période"</strong> en haut à gauche pour choisir le mois à clôturer.</p>
                  </DocStep>
                  <DocStep number={2} title="Vérifier les données">
                    <p>Consultez le tableau <strong>"Consolidé par salarié"</strong> pour vous assurer que toutes les fiches sont validées et les absences qualifiées.</p>
                  </DocStep>
                  <DocStep number={3} title="Clôturer">
                    <p>
                      Cliquez sur le bouton <strong>"Clôturer la période"</strong> en haut à droite de la page et confirmez.
                    </p>
                  </DocStep>
                </div>
                <DocNote type="warning">
                  <strong>Action irréversible :</strong> Une fois clôturée, la période ne peut plus être modifiée.
                  Les fiches passent en statut "CLOTURE".
                </DocNote>
              </DocSubsection>
            </DocSection>

            <GradientSeparator />

            {/* ============ GUIDE ADMIN ============ */}
            <DocSection 
              id="admin" 
              title="Guide Administrateur" 
              icon={<Settings className="h-5 w-5" />}
              isVisible={visibleSections.has("admin")}
            >
              <DocSubsection id="admin-dashboard" title="Dashboard">
                <p className="text-muted-foreground mb-5">
                  Le dashboard offre une vue temps réel de l'activité du mois en cours.
                </p>
                <DocImage 
                  src={docDashboard} 
                  alt="Dashboard administrateur" 
                  caption="Vue d'ensemble du dashboard avec statistiques et indicateurs clés"
                />
                <Card className="doc-card-hover mt-6">
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-4">Informations affichées :</h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        Chantiers actifs
                      </li>
                      <li className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        Fiches créées (total toutes périodes)
                      </li>
                      <li className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-primary" />
                        Fiches en attente de validation
                      </li>
                      <li className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Heures saisies (semaine et mois)
                      </li>
                      <li className="flex items-center gap-3">
                        <Send className="h-5 w-5 text-primary" />
                        Progression des transmissions par semaine
                      </li>
                      <li className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Répartition des fiches par statut
                      </li>
                      <li className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-primary" />
                        Alertes et actions en attente
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </DocSubsection>

              <DocSubsection id="admin-utilisateurs" title="Gestion des utilisateurs">
                <DocImage 
                  src={docGestionUtilisateurs} 
                  alt="Interface de gestion des utilisateurs" 
                />
                <div className="space-y-5 mt-6">
                  <DocStep number={1} title="Inviter un utilisateur">
                    <p>
                      Cliquez sur le bouton <strong>"Inviter un utilisateur"</strong> situé en haut à droite de la page, renseignez l'email et sélectionnez le rôle :
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge className="doc-badge-admin">Admin</Badge>
                      <Badge className="doc-badge-rh">RH</Badge>
                      <Badge className="doc-badge-conducteur">Conducteur</Badge>
                      <Badge className="doc-badge-chef">Chef</Badge>
                    </div>
                  </DocStep>
                  <DocStep number={2} title="Compléter les informations">
                    <p>
                      Une fois que l'utilisateur invité s'est connecté pour la première fois, 
                      il est nécessaire de renseigner ses informations contractuelles 
                      (type de contrat, heures hebdomadaires, coefficient, etc.). 
                      Ces informations peuvent être complétées depuis l'onglet <strong>"Utilisateurs"</strong> ou 
                      directement depuis l'onglet correspondant à son rôle 
                      (Conducteurs, Chefs, RH, admin.) dans la page d'administration.
                    </p>
                  </DocStep>
                  <DocStep number={3} title="Ajouter un maçon, grutier ou finisseur">
                    <p>
                      Contrairement aux conducteurs, chefs et RH, les <strong>maçons, grutiers et finisseurs</strong> n'ont 
                      pas besoin d'invitation car ils n'accèdent pas à l'application. 
                      Pour les ajouter :
                    </p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Accédez à la <strong>page d'administration</strong></li>
                      <li>Sélectionnez l'onglet correspondant (<strong>"Maçons"</strong>, <strong>"Grutiers"</strong> ou <strong>"Finisseurs"</strong>)</li>
                      <li>Cliquez sur <strong>"Ajouter"</strong></li>
                      <li>Renseignez leurs informations (nom, prénom, matricule, informations contractuelles)</li>
                    </ol>
                    <p className="mt-2 text-muted-foreground text-sm">
                      Ces profils servent uniquement au suivi des heures et à la génération des fiches de pointage. 
                      Ils ne disposent d'aucun accès à l'application.
                    </p>
                  </DocStep>
                </div>
              </DocSubsection>

              <DocSubsection id="admin-chantiers" title="Gestion des chantiers">
                <div className="space-y-5">
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
                <p className="text-muted-foreground mb-5">
                  Les onglets de référentiels permettent de gérer les données de base.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="doc-card-hover">
                    <CardContent className="p-5">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
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
                  <Card className="doc-card-hover">
                    <CardContent className="p-5">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        Chantiers
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Code et nom du chantier</li>
                        <li>• Client et adresse</li>
                        <li>• Chef de chantier assigné</li>
                        <li>• Conducteur responsable</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="doc-card-hover">
                    <CardContent className="p-5">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Car className="h-4 w-4 text-primary" />
                        Véhicules
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Immatriculation</li>
                        <li>• Marque et modèle</li>
                        <li>• Utilisés dans les fiches trajet</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </DocSubsection>

              <DocSubsection id="admin-rappels" title="Rappels automatiques">
                <p className="text-muted-foreground mb-5">
                  Le système envoie des rappels par email automatiquement.
                </p>
                <Card className="doc-card-hover doc-card-accent">
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-4">Rappels programmés :</h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-amber-500" />
                        <strong>Lundi 8h :</strong> Rappel aux chefs de saisir les heures
                      </li>
                      <li className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-amber-500" />
                        <strong>Vendredi 12h :</strong> Rappel aux chefs de transmettre
                      </li>
                      <li className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-blue-500" />
                        <strong>Quotidien :</strong> Rappel aux conducteurs pour validation
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                <p className="text-muted-foreground mt-5">
                  L'historique des rappels est consultable dans l'onglet "Rappels".
                </p>
              </DocSubsection>
            </DocSection>


            {/* Footer amélioré */}
            <div className="mt-20 pt-10 border-t border-border">
              <div className="bg-gradient-to-br from-muted/50 to-transparent rounded-2xl p-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">Documentation DIVA RH</span>
                </div>
                <p className="text-muted-foreground text-sm mb-2">
                  Version 1.0 • {new Date().getFullYear()}
                </p>
                <p className="text-muted-foreground text-xs">
                  Pour toute question, contactez votre administrateur.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      <ScrollToTopButton />
    </PageLayout>
  );
};

export default Documentation;
