import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Portfolio from "./pages/Portfolio";
import OrgObjectiveDetail from "./pages/OrgObjectiveDetail";
import DepartmentDetail from "./pages/DepartmentDetail";
import KeyResultDetail from "./pages/KeyResultDetail";
import IndicatorDetail from "./pages/IndicatorDetail";
import CustomersPage from "./pages/CustomersPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import FeaturesPage from "./pages/FeaturesPage";
import FeatureDetailPage from "./pages/FeatureDetailPage";
import AdminUpload from "./pages/AdminUpload";
import Auth from "./pages/Auth";
import Verify2FA from "./pages/Verify2FA";
import DataManagement from "./pages/DataManagement";
import DepartmentDataEntry from "./pages/DepartmentDataEntry";
import DataEntryTimeline from "./pages/DataEntryTimeline";
import AdminDepartmentStatus from "./pages/AdminDepartmentStatus";
import AdminDashboard from "./pages/AdminDashboard";
import CSMDataEntry from "./pages/CSMDataEntry";
import ComplianceReport from "./pages/ComplianceReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth routes - no layout, no guard */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/verify-2fa" element={<Verify2FA />} />

              {/* All other routes - protected */}
              <Route path="/" element={<ProtectedRoute><AppLayout><Portfolio /></AppLayout></ProtectedRoute>} />
              <Route path="/portfolio" element={<ProtectedRoute><AppLayout><Portfolio /></AppLayout></ProtectedRoute>} />
              <Route path="/data" element={<ProtectedRoute><DataManagement /></ProtectedRoute>} />
              <Route path="/org-objective/:orgObjectiveId" element={<ProtectedRoute><AppLayout><OrgObjectiveDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/department/:departmentId" element={<ProtectedRoute><AppLayout><DepartmentDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/department/:departmentId/data-entry" element={<ProtectedRoute><AppLayout><DepartmentDataEntry /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/data-timeline" element={<ProtectedRoute><AppLayout><DataEntryTimeline /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/status" element={<ProtectedRoute><AppLayout><AdminDepartmentStatus /></AppLayout></ProtectedRoute>} />
              <Route path="/org-objective/:orgObjectiveId/okr/:krId" element={<ProtectedRoute><AppLayout><KeyResultDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/org-objective/:orgObjectiveId/indicator/:indicatorId" element={<ProtectedRoute><AppLayout><IndicatorDetail /></AppLayout></ProtectedRoute>} />

              {/* Customer impact routes */}
              <Route path="/customers" element={<ProtectedRoute><AppLayout><CustomersPage /></AppLayout></ProtectedRoute>} />
              <Route path="/customers/:customerId" element={<ProtectedRoute><AppLayout><CustomerDetailPage /></AppLayout></ProtectedRoute>} />

              {/* Feature impact routes */}
              <Route path="/features" element={<ProtectedRoute><AppLayout><FeaturesPage /></AppLayout></ProtectedRoute>} />
              <Route path="/features/:featureId" element={<ProtectedRoute><AppLayout><FeatureDetailPage /></AppLayout></ProtectedRoute>} />

              {/* CSM data entry route */}
              <Route path="/csm/data-entry" element={<ProtectedRoute><AppLayout><CSMDataEntry /></AppLayout></ProtectedRoute>} />

              {/* Utility routes */}
              <Route path="/admin" element={<ProtectedRoute><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/compliance-report" element={<ProtectedRoute><AppLayout><ComplianceReport /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/upload" element={<ProtectedRoute><AppLayout><AdminUpload /></AppLayout></ProtectedRoute>} />
              <Route path="*" element={<ProtectedRoute><AppLayout><NotFound /></AppLayout></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
