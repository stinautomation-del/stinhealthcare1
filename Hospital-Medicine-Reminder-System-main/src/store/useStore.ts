// Zustand Store for Hospital Medicine Reminder System

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User,
  Patient,
  Prescription,
  ScheduleEntry,
  MessageTemplate,
  NursePatientReminder,
  Escalation,
  Ward,
  DashboardStats,
  WardStats,
  NotificationPayload,
  UserRole,
} from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

interface DataState {
  // Data
  patients: Patient[];
  prescriptions: Prescription[];
  scheduleEntries: ScheduleEntry[];
  nurseReminders: NursePatientReminder[];
  messageTemplates: MessageTemplate[];
  escalations: Escalation[];
  wards: Ward[];
  users: User[];
  dashboardStats: DashboardStats | null;
  wardStats: WardStats[];
  notifications: NotificationPayload[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  setPatients: (patients: Patient[]) => void;
  setPrescriptions: (prescriptions: Prescription[]) => void;
  setScheduleEntries: (entries: ScheduleEntry[]) => void;
  setNurseReminders: (reminders: NursePatientReminder[]) => void;
  setMessageTemplates: (templates: MessageTemplate[]) => void;
  setEscalations: (escalations: Escalation[]) => void;
  setWards: (wards: Ward[]) => void;
  setUsers: (users: User[]) => void;
  setDashboardStats: (stats: DashboardStats) => void;
  setWardStats: (stats: WardStats[]) => void;
  addNotification: (notification: NotificationPayload) => void;
  clearNotifications: () => void;

  // CRUD operations
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  addPrescription: (prescription: Prescription) => void;
  updateScheduleEntry: (id: string, updates: Partial<ScheduleEntry>) => void;
  addNurseReminder: (reminder: NursePatientReminder) => void;
  updateNurseReminder: (id: string, updates: Partial<NursePatientReminder>) => void;
  cancelNurseReminder: (id: string, cancelledBy: string) => void;
  resolveEscalation: (id: string, resolvedBy: string) => void;

  // Loading actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Auth Store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      hasRole: (roles) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },
    }),
    {
      name: 'hospital-auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Data Store
export const useDataStore = create<DataState>()((set) => ({
  // Initial data
  patients: [],
  prescriptions: [],
  scheduleEntries: [],
  nurseReminders: [],
  messageTemplates: [],
  escalations: [],
  wards: [],
  users: [],
  dashboardStats: null,
  wardStats: [],
  notifications: [],

  // Loading states
  isLoading: false,
  error: null,

  // Setters
  setPatients: (patients) => set({ patients }),
  setPrescriptions: (prescriptions) => set({ prescriptions }),
  setScheduleEntries: (scheduleEntries) => set({ scheduleEntries }),
  setNurseReminders: (nurseReminders) => set({ nurseReminders }),
  setMessageTemplates: (messageTemplates) => set({ messageTemplates }),
  setEscalations: (escalations) => set({ escalations }),
  setWards: (wards) => set({ wards }),
  setUsers: (users) => set({ users }),
  setDashboardStats: (dashboardStats) => set({ dashboardStats }),
  setWardStats: (wardStats) => set({ wardStats }),
  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications].slice(0, 50) })),
  clearNotifications: () => set({ notifications: [] }),

  // CRUD operations
  addPatient: (patient) =>
    set((state) => ({ patients: [...state.patients, patient] })),

  updatePatient: (id, updates) =>
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  addPrescription: (prescription) =>
    set((state) => ({ prescriptions: [...state.prescriptions, prescription] })),

  updateScheduleEntry: (id, updates) =>
    set((state) => ({
      scheduleEntries: state.scheduleEntries.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  addNurseReminder: (reminder) =>
    set((state) => ({ nurseReminders: [...state.nurseReminders, reminder] })),

  updateNurseReminder: (id, updates) =>
    set((state) => ({
      nurseReminders: state.nurseReminders.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  cancelNurseReminder: (id, cancelledBy) =>
    set((state) => ({
      nurseReminders: state.nurseReminders.map((r) =>
        r.id === id
          ? { ...r, deliveryStatus: 'cancelled', cancelledBy, cancelledAt: new Date().toISOString() }
          : r
      ),
    })),

  resolveEscalation: (id, resolvedBy) =>
    set((state) => ({
      escalations: state.escalations.map((e) =>
        e.id === id
          ? { ...e, status: 'resolved', resolvedBy, resolvedAt: new Date().toISOString() }
          : e
      ),
    })),

  // Loading actions
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

// UI Store for UI-specific state
interface UIState {
  sidebarOpen: boolean;
  currentView: string;
  selectedPatient: Patient | null;
  patientModalInitialTab: 'info' | 'prescriptions' | 'schedule';
  selectedPrescription: Prescription | null;
  selectedReminder: ScheduleEntry | null;
  reminderModalOpen: boolean;
  patientModalOpen: boolean;
  prescriptionModalOpen: boolean;
  nurseReminderModalOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentView: (view: string) => void;
  setSelectedPatient: (patient: Patient | null) => void;
  setSelectedPrescription: (prescription: Prescription | null) => void;
  setSelectedReminder: (reminder: ScheduleEntry | null) => void;
  openReminderModal: () => void;
  closeReminderModal: () => void;
  openPatientModal: (tab?: 'info' | 'prescriptions' | 'schedule') => void;
  closePatientModal: () => void;
  openPrescriptionModal: () => void;
  closePrescriptionModal: () => void;
  openNurseReminderModal: () => void;
  closeNurseReminderModal: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  currentView: 'dashboard',
  selectedPatient: null,
  patientModalInitialTab: 'info',
  selectedPrescription: null,
  selectedReminder: null,
  reminderModalOpen: false,
  patientModalOpen: false,
  prescriptionModalOpen: false,
  nurseReminderModalOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCurrentView: (currentView) => set({ currentView }),
  setSelectedPatient: (selectedPatient) => set({ selectedPatient }),
  setSelectedPrescription: (selectedPrescription) => set({ selectedPrescription }),
  setSelectedReminder: (selectedReminder) => set({ selectedReminder }),
  openReminderModal: () => set({ reminderModalOpen: true }),
  closeReminderModal: () => set({ reminderModalOpen: false, selectedReminder: null }),
  openPatientModal: (tab = 'info') => set({ patientModalOpen: true, patientModalInitialTab: tab }),
  closePatientModal: () => set({ patientModalOpen: false, selectedPatient: null, patientModalInitialTab: 'info' }),
  openPrescriptionModal: () => set({ prescriptionModalOpen: true }),
  closePrescriptionModal: () => set({ prescriptionModalOpen: false, selectedPrescription: null }),
  openNurseReminderModal: () => set({ nurseReminderModalOpen: true }),
  closeNurseReminderModal: () => set({ nurseReminderModalOpen: false }),
}));
