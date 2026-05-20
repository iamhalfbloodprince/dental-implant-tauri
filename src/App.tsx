import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage, SetupPage } from "@/pages/AuthPages";
import { DashboardPage } from "@/pages/DashboardPage";
import { ClinicsPage } from "@/pages/ClinicsPage";
import { PatientsPage } from "@/pages/PatientsPage";
import { PatientFormPage, PatientProfilePage } from "@/pages/patient";
import { LogbookPage, SettingsPage, BackupPage, ReportsPage } from "@/pages/MiscPages";
import { LogbookFormPage } from "@/pages/LogbookFormPage";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

function RequireAuth() {
  const { status, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm">
        Loading…
      </div>
    );
  }
  if (!status?.hasAccount) {
    return <Navigate to="/setup" replace />;
  }
  if (!status.authenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="clinics" element={<ClinicsPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/new" element={<PatientFormPage />} />
          <Route path="patients/:id/edit" element={<PatientFormPage />} />
          <Route path="patients/:id" element={<PatientProfilePage />} />
          <Route path="logbook" element={<LogbookPage />} />
          <Route path="logbook/new" element={<LogbookFormPage />} />
          <Route path="logbook/edit/:lid" element={<LogbookFormPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="backup" element={<BackupPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
