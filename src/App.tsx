import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppLayout } from "@/components/AppLayout";
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
import DataManagement from "./pages/DataManagement";
import DepartmentDataEntry from "./pages/DepartmentDataEntry";
import DataEntryTimeline from "./pages/DataEntryTimeline";
import AdminDepartmentStatus from "./pages/AdminDepartmentStatus";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth routes - no layout */}
              <Route path="/auth" element={<Auth />} />

              {/* Main app routes with layout */}
              <Route path="/" element={<AppLayout><Portfolio /></AppLayout>} />
              <Route path="/portfolio" element={<AppLayout><Portfolio /></AppLayout>} />
              <Route path="/data" element={<AppLayout><DataManagement /></AppLayout>} />
              <Route path="/org-objective/:orgObjectiveId" element={<AppLayout><OrgObjectiveDetail /></AppLayout>} />
              <Route path="/department/:departmentId" element={<AppLayout><DepartmentDetail /></AppLayout>} />
              <Route path="/department/:departmentId/data-entry" element={<AppLayout><DepartmentDataEntry /></AppLayout>} />
              <Route path="/admin/data-timeline" element={<AppLayout><DataEntryTimeline /></AppLayout>} />
              <Route path="/admin/status" element={<AppLayout><AdminDepartmentStatus /></AppLayout>} />
              <Route path="/org-objective/:orgObjectiveId/okr/:krId" element={<AppLayout><KeyResultDetail /></AppLayout>} />
              <Route path="/org-objective/:orgObjectiveId/indicator/:indicatorId" element={<AppLayout><IndicatorDetail /></AppLayout>} />

              {/* Customer impact routes */}
              <Route path="/customers" element={<AppLayout><CustomersPage /></AppLayout>} />
              <Route path="/customers/:customerId" element={<AppLayout><CustomerDetailPage /></AppLayout>} />

              {/* Feature impact routes */}
              <Route path="/features" element={<AppLayout><FeaturesPage /></AppLayout>} />
              <Route path="/features/:featureId" element={<AppLayout><FeatureDetailPage /></AppLayout>} />

              {/* Utility routes */}
              <Route path="/admin" element={<AppLayout><AdminDashboard /></AppLayout>} />
              <Route path="/admin/upload" element={<AppLayout><AdminUpload /></AppLayout>} />
              <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
