import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "@/contexts/AuthProvider";
import InstallPWA from "@/components/pwa/InstallPWA";
import Index from "./pages/Index";
import ValidationConducteur from "./pages/ValidationConducteur";
import ConsultationRH from "./pages/ConsultationRH";
import SignatureMacons from "./pages/SignatureMacons";
import SignatureFinisseurs from "./pages/SignatureFinisseurs";
import AdminPanel from "./pages/AdminPanel";
import ChantierDetail from "./pages/ChantierDetail";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import RequireAuth from "./components/auth/RequireAuth";
import { RequireRole } from "./components/auth/RequireRole";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPWA />
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/install" element={<Install />} />
          <Route element={<RequireAuth />}>
            {/* Saisie Chef - Accessible par: admin, chef */}
            <Route 
              path="/" 
              element={
                <RequireRole allowedRoles={["admin", "chef"]}>
                  <Index />
                </RequireRole>
              } 
            />
            
            {/* Redirection pour ancienne route */}
            <Route 
              path="/saisie-conducteur" 
              element={<Navigate to="/validation-conducteur" replace />}
            />
            
            {/* Validation Conducteur - Accessible par: admin, conducteur */}
            <Route 
              path="/validation-conducteur" 
              element={
                <RequireRole allowedRoles={["admin", "conducteur"]}>
                  <ValidationConducteur />
                </RequireRole>
              } 
            />
            
            {/* Consultation RH - Accessible par: admin, rh */}
            <Route 
              path="/consultation-rh" 
              element={
                <RequireRole allowedRoles={["admin", "rh"]}>
                  <ConsultationRH />
                </RequireRole>
              } 
            />
            
            {/* Signature Maçons - Accessible par tous les authentifiés */}
            <Route path="/signature-macons" element={<SignatureMacons />} />
            
            {/* Signature Finisseurs - Accessible par: admin, conducteur */}
            <Route 
              path="/signature-finisseurs" 
              element={
                <RequireRole allowedRoles={["admin", "conducteur"]}>
                  <SignatureFinisseurs />
                </RequireRole>
              } 
            />
            
            {/* Admin Panel - Accessible UNIQUEMENT par: admin */}
            <Route 
              path="/admin" 
              element={
                <RequireRole allowedRoles={["admin"]}>
                  <AdminPanel />
                </RequireRole>
              } 
            />
            
            {/* Chantier Detail - Accessible par: admin */}
            <Route 
              path="/admin/chantiers/:id" 
              element={
                <RequireRole allowedRoles={["admin"]}>
                  <ChantierDetail />
                </RequireRole>
              } 
            />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
