// Hospital Medicine Reminder System - Type Definitions

export type UserRole = 
  | 'admin' 
  | 'doctor' 
  | 'head_nurse'
  | 'nurse';

export type ReminderStatus = 'pending' | 'given' | 'missed' | 'escalated';

export type NotificationChannel = 'whatsapp' | 'sms' | 'both';

export type NotificationPreference = 'whatsapp' | 'sms' | 'both' | 'none';

export type Language = 'en' | 'ta' | 'hi';

export type RecurrenceType = 'none' | 'daily' | 'weekly';

export type DeliveryStatus = 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled';

export type TemplateCategory = 'medication' | 'procedure' | 'discharge' | 'custom';

export type DosageFrequency = 'OD' | 'BD' | 'TDS' | 'QID' | 'Custom';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  ward?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  licenseNumber?: string;
  employeeId?: string;
  speciality?: string;
  auth0Id?: string;
}

export interface Patient {
  id: string;
  fullName: string;
  phone: string;
  whatsappNumber?: string;
  ward: string;
  room: string;
  bed: string;
  doctorId: string;
  doctorName: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  preferredLanguage: Language;
  notificationPreference: NotificationPreference;
  allergies: string[];
  isActive: boolean;
  admittedAt: string;
  dischargedAt?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  medicineName: string;
  dose: string;
  quantity: number;
  frequency: DosageFrequency;
  times: string[];
  startDate: string;
  endDate: string;
  specialInstructions?: string;
  prescribedBy: string;
  prescribedByName: string;
  prescribedAt: string;
  isActive: boolean;
}

export interface ScheduleEntry {
  id: string;
  prescriptionId: string;
  patientId: string;
  patientName: string;
  ward: string;
  room: string;
  bed: string;
  medicineName: string;
  dose: string;
  quantity: number;
  scheduledTime: string;
  scheduledDate: string;
  status: ReminderStatus;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  acknowledgedByName?: string;
  escalatedAt?: string;
  escalatedTo?: string;
  notificationSent: boolean;
  notificationChannel?: NotificationChannel;
}

export interface ReminderAlert {
  id: string;
  scheduleEntryId: string;
  patientId: string;
  patientName: string;
  ward: string;
  room: string;
  bed: string;
  medicineName: string;
  dose: string;
  quantity: number;
  scheduledTime: string;
  scheduledDate: string;
  status: ReminderStatus;
  createdAt: string;
}

export interface NursePatientReminder {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  nurseId: string;
  nurseName: string;
  messageBody: string;
  templateId?: string;
  templateName?: string;
  language: Language;
  channel: NotificationChannel;
  startDate: string;
  endDate: string;
  scheduledAt: string;
  sentAt?: string;
  deliveryStatus: DeliveryStatus;
  retryCount?: number;
  nextAttemptAt?: string;
  lastAttemptAt?: string;
  lastError?: string;
  providerMessageSid?: string;
  sendAttemptKey?: string;
  recurrence: RecurrenceType;
  cancelledBy?: string;
  cancelledAt?: string;
  clearedAt?: string;
  clearedBy?: string;
  clearedByName?: string;
  internalNote?: string;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  bodyEn: string;
  bodyTa: string;
  bodyHi: string;
  metaApproved: boolean;
  category: TemplateCategory;
  variables: string[];
}

export interface Escalation {
  id: string;
  scheduleEntryId: string;
  patientId: string;
  patientName: string;
  ward: string;
  medicineName: string;
  scheduledTime: string;
  escalatedAt: string;
  escalatedTo: string;
  escalatedToName: string;
  resolvedAt?: string;
  resolvedBy?: string;
  status: 'open' | 'resolved';
}

export interface Ward {
  id: string;
  name: string;
  floor: string;
  totalBeds: number;
  occupiedBeds: number;
  headNurseId?: string;
  headNurseName?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface DashboardStats {
  totalPatients: number;
  totalPrescriptions: number;
  todayReminders: number;
  givenDoses: number;
  missedDoses: number;
  pendingDoses: number;
  escalationRate: number;
  avgAcknowledgementTime: number;
}

export interface WardStats {
  wardId: string;
  wardName: string;
  totalPatients: number;
  todayReminders: number;
  givenDoses: number;
  missedDoses: number;
  pendingDoses: number;
  escalationCount: number;
}

export interface NotificationPayload {
  type: 'reminder' | 'escalation' | 'confirmation' | 'system';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends LoginCredentials {
  name: string;
  role: UserRole;
  ward?: string;
  licenseNumber: string;
  employeeId?: string;
  phone?: string;
  speciality?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
}
