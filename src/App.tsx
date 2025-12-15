import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/common/AuthProvider";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import Dashboard from "./pages/dashboard";
import Skills from "./pages/skills";
import Approvals from "./pages/approvals";
import SkillExplorer from "./pages/skill-explorer";
import Projects from "./pages/projects";
import Reports from "./pages/reports";
import Admin from "./pages/admin";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import NoAccess from "./pages/NoAccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ImpersonationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/no-access" element={<NoAccess />} />
              <Route path="/*" element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/skills" element={<ProtectedRoute><Skills /></ProtectedRoute>} />
                    <Route path="/approvals" element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
                    <Route path="/skill-explorer" element={<ProtectedRoute><SkillExplorer /></ProtectedRoute>} />
                    <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                    
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              } />
            </Routes>
          </BrowserRouter>
        </ImpersonationProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
