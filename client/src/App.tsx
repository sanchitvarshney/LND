import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import { Spinner } from './components/ui/Primitives';
import Login from './pages/Login';
import LearnerDashboard from './pages/LearnerDashboard';
import AdminOverview from './pages/AdminOverview';
import Catalog from './pages/Catalog';
import ModuleDetail from './pages/ModuleDetail';
import Player from './pages/Player';
import Assessment from './pages/Assessment';
import Result from './pages/Result';
import Certificate from './pages/Certificate';
import Certificates from './pages/Certificates';
import Team from './pages/Team';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Admin from './pages/Admin';
import Verify from './pages/Verify';
import Setup from './pages/Setup';

function Protected({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (roles && !roles.includes(user.role) && user.role !== 'super_admin') return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function Home() {
  const { user } = useAuth();
  return (user?.role === 'admin' || user?.role === 'super_admin') ? <AdminOverview /> : <LearnerDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/verify/:hash" element={<Verify />} />
      <Route path="/" element={<Protected><Home /></Protected>} />
      <Route path="/catalog" element={<Protected><Catalog /></Protected>} />
      <Route path="/modules/:id" element={<Protected><ModuleDetail /></Protected>} />
      <Route path="/modules/:id/player" element={<Protected><Player /></Protected>} />
      <Route path="/modules/:id/assessment" element={<Protected><Assessment /></Protected>} />
      <Route path="/attempts/:id/result" element={<Protected><Result /></Protected>} />
      <Route path="/certificates" element={<Protected><Certificates /></Protected>} />
      <Route path="/certificates/:id" element={<Protected><Certificate /></Protected>} />
      <Route path="/team" element={<Protected roles={['manager', 'admin']}><Team /></Protected>} />
      <Route path="/reports" element={<Protected roles={['admin']}><Reports /></Protected>} />
      <Route path="/audit" element={<Protected roles={['admin']}><Audit /></Protected>} />
      <Route path="/admin" element={<Protected roles={['admin']}><Admin /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
