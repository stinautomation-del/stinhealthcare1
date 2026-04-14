import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { useUIStore, useDataStore, useAuthStore } from '@/store/useStore';
import { Loader2 } from 'lucide-react';
import { authApi, notificationsApi, patientsApi, scheduleApi, escalationsApi, dashboardApi } from '@/services/api';
import type { Patient, ScheduleEntry } from '@/types';

let restoreSessionPromise: Promise<Awaited<ReturnType<typeof authApi.getCurrentUser>>> | null = null;

const Sidebar = lazy(() => import('@/components/layout/Sidebar').then((mod) => ({ default: mod.Sidebar })));
const Header = lazy(() => import('@/components/layout/Header').then((mod) => ({ default: mod.Header })));
const Dashboard = lazy(() => import('@/components/dashboard/Dashboard').then((mod) => ({ default: mod.Dashboard })));
const PatientsList = lazy(() => import('@/components/patients/PatientsList').then((mod) => ({ default: mod.PatientsList })));
const PrescriptionsList = lazy(() => import('@/components/prescriptions/PrescriptionsList').then((mod) => ({ default: mod.PrescriptionsList })));
const RemindersList = lazy(() => import('@/components/reminders/RemindersList').then((mod) => ({ default: mod.RemindersList })));
const NurseReminderScheduler = lazy(() => import('@/components/nurse-reminders/NurseReminderScheduler').then((mod) => ({ default: mod.NurseReminderScheduler })));
const EscalationsList = lazy(() => import('@/components/escalations/EscalationsList').then((mod) => ({ default: mod.EscalationsList })));
const Settings = lazy(() => import('@/components/settings/Settings').then((mod) => ({ default: mod.Settings })));
const LoginForm = lazy(() => import('@/components/auth/LoginForm').then((mod) => ({ default: mod.LoginForm })));
const LandingPage = lazy(() => import('@/components/layout/LandingPage').then((mod) => ({ default: mod.LandingPage })));

function ViewLoader() {
  return (
    <div className="min-h-[300px] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

/** Keeps the Zustand UI store's currentView in sync with the URL pathname */
function RouteSync() {
  const location = useLocation();
  const { setCurrentView } = useUIStore();

  useEffect(() => {
    const segment = location.pathname.split('/').filter(Boolean)[0] || 'dashboard';
    setCurrentView(segment);
  }, [location.pathname, setCurrentView]);

  return null;
}

function App() {
  const { isAuthenticated, login } = useAuthStore();
  const navigate = useNavigate();
  const [authView, setAuthView] = useState<'landing' | 'login'>('landing');
  const [isBootstrappingAuth, setIsBootstrappingAuth] = useState(true);
  const { 
    setPatients, 
    setScheduleEntries, 
    setEscalations,
    updatePatient,
    updateScheduleEntry,
    addPatient,
    addNotification,
    setDashboardStats
  } = useDataStore();

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      if (!restoreSessionPromise) {
        restoreSessionPromise = authApi.getCurrentUser().finally(() => {
          restoreSessionPromise = null;
        });
      }

      const currentUserRes = await restoreSessionPromise;
      if (!isMounted) return;

      if (currentUserRes.success && currentUserRes.data) {
        login(currentUserRes.data, '');
      }

      setIsBootstrappingAuth(false);
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [login]);

  useEffect(() => {
    if (!isAuthenticated || isBootstrappingAuth) return;

    let unsubscribe: (() => void) | null = null;

    // 1. Initial Load
    const loadRealtimeData = async () => {
      if (!navigator.onLine) return;

      try {
        const [patientsRes, scheduleRes, escalationsRes, statsRes] = await Promise.all([
          patientsApi.getAll(),
          scheduleApi.getToday(),
          escalationsApi.getOpen(),
          dashboardApi.getStats()
        ]);
        if (patientsRes.success) setPatients(patientsRes.data!);
        if (scheduleRes.success) setScheduleEntries(scheduleRes.data!);
        if (escalationsRes.success) setEscalations(escalationsRes.data!);
        if (statsRes.success) setDashboardStats(statsRes.data!);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        const isNetworkIssue =
          message.includes('failed to fetch') ||
          message.includes('network') ||
          message.includes('internet disconnected') ||
          message.includes('connection closed');

        if (!isNetworkIssue) {
          console.error('Error loading realtime data:', error);
        }
      }
    };

    loadRealtimeData();

    const setupRealtime = () => {
      if (!navigator.onLine || unsubscribe) return;

      // 2. Real-time Subscription
      unsubscribe = notificationsApi.subscribeToAll(
        (payload) => {
          // Patient changed
          if (payload.eventType === 'INSERT') addPatient(payload.new as unknown as Patient);
          else if (payload.eventType === 'UPDATE') {
            const updatedPatient = payload.new as unknown as Patient;
            updatePatient(updatedPatient.id, updatedPatient);
          }
          else loadRealtimeData(); // Re-fetch on other changes
        },
        (payload) => {
          // Schedule changed
          if (payload.eventType === 'UPDATE') {
            const updatedEntry = payload.new as unknown as ScheduleEntry;
            updateScheduleEntry(updatedEntry.id, updatedEntry);
          }
          else loadRealtimeData();
        },
        (payload) => {
          // Escalation changed
          loadRealtimeData();
          if (payload.eventType === 'INSERT') {
            const escalation = payload.new as Record<string, unknown>;
            const msg = `Emergency: Missed dose for ${String(escalation.patientName ?? 'a patient')}`;

            toast.error('New Escalation', {
              description: msg,
              duration: 8000,
            });

            addNotification({
              type: 'escalation',
              title: 'New Escalation',
              message: msg,
              timestamp: new Date().toISOString()
            });
          }
        }
      );
    };

    setupRealtime();

    const onOnline = () => {
      loadRealtimeData();
      setupRealtime();
    };

    const onOffline = () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (unsubscribe) unsubscribe();
    };
  }, [isAuthenticated, setPatients, setScheduleEntries, setEscalations, updatePatient, updateScheduleEntry, addPatient, addNotification, setDashboardStats]);

  if (isBootstrappingAuth) {
    return <ViewLoader />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<ViewLoader />}>
        {authView === 'landing' ? (
          <LandingPage onLoginClick={() => setAuthView('login')} />
        ) : (
          <LoginForm onBack={() => setAuthView('landing')} />
        )}
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Toaster position="top-right" richColors closeButton />
      <RouteSync />
      <Suspense fallback={<ViewLoader />}>
        <Sidebar navigate={navigate} />
      </Suspense>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Suspense fallback={<ViewLoader />}>
          <Header />
        </Suspense>
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<ViewLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/patients" element={<PatientsList />} />
              <Route path="/prescriptions" element={<PrescriptionsList />} />
              <Route path="/reminders" element={<RemindersList />} />
              <Route path="/nurse-reminders" element={<NurseReminderScheduler />} />
              <Route path="/escalations" element={<EscalationsList />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
