// Supabase API Service for Hospital Medicine Reminder System
import { supabase } from '@/lib/supabase';
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
  LoginCredentials,
  SignUpCredentials,
  ApiResponse,
  NotificationPayload,
} from '@/types';

interface AuthIdentity {
  email: string;
  sub: string;
  name?: string;
  nickname?: string;
}

interface RealtimeChangePayload {
  eventType: string;
  new: Record<string, unknown>;
  old?: Record<string, unknown>;
}

interface DueReminderFailure {
  id: string;
  error: string;
}

interface ProcessDueRemindersResult {
  success: boolean;
  scanned: number;
  sent: number;
  failed: number;
  failures: DueReminderFailure[];
  error?: string;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
};

const getAuthErrorMessage = (error: string): string => {
  const normalized = error.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }

  if (normalized.includes('user already registered') || normalized.includes('already exists')) {
    return 'An account with this email already exists.';
  }

  if (normalized.includes('password should be at least')) {
    return 'Password must contain at least 8 characters.';
  }

  return error;
};

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) return { success: false, error: getAuthErrorMessage(error.message) };
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) return { success: false, error: 'User profile not found' };

      return {
        success: true,
        data: {
          user: profile as User,
          token: data.session?.access_token || '',
        },
      };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  signUp: async (credentials: SignUpCredentials): Promise<ApiResponse<{ user: User; token: string }>> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.name,
            role: credentials.role,
            ward: credentials.ward,
            licenseNumber: credentials.licenseNumber,
            employeeId: credentials.employeeId,
            phone: credentials.phone,
            speciality: credentials.speciality,
          }
        }
      });

      if (error) return { success: false, error: getAuthErrorMessage(error.message) };
      if (!data.user) return { success: false, error: 'Failed to create user' };

      // Wait for Supabase trigger to create profile (with retry)
      let profile = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!profile && attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 300));
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        
        if (profileData) {
          profile = profileData;
          break;
        }

        if (profileError && profileError.code !== 'PGRST116') {
          return { success: false, error: profileError.message };
        }
      }

      // If profile exists in DB, return it; otherwise return constructed object
      return {
        success: true,
        data: {
          user: profile || {
            id: data.user.id,
            name: credentials.name,
            email: credentials.email,
            role: credentials.role,
            ward: credentials.ward,
            licenseNumber: credentials.licenseNumber,
            employeeId: credentials.employeeId,
            phone: credentials.phone,
            speciality: credentials.speciality,
            isActive: true,
            createdAt: new Date().toISOString(),
          } as User,
          token: data.session?.access_token || '',
        },
      };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  requestPasswordReset: async (email: string): Promise<ApiResponse<void>> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?reset=1`,
      });

      if (error) return { success: false, error: getAuthErrorMessage(error.message) };

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  syncProfile: async (auth0User: AuthIdentity): Promise<ApiResponse<User>> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', auth0User.email)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is not found
        return { success: false, error: error.message };
      }

      if (profile) {
        // Update auth0Id if missing
        if (!profile.auth0Id) {
          await supabase.from('profiles').update({ auth0Id: auth0User.sub }).eq('id', profile.id);
        }
        return { success: true, data: profile as User };
      }

      // Create profile for first-time user
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: crypto.randomUUID(), // Or handle mapping differently
          auth0Id: auth0User.sub,
          email: auth0User.email,
          name: auth0User.name || auth0User.nickname,
          role: 'nurse', // Default role
          isActive: true,
        }])
        .select()
        .single();

      if (createError) return { success: false, error: createError.message };

      return { success: true, data: newProfile as User };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  logout: async (): Promise<ApiResponse<void>> => {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        data: profile as User
      };
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      const normalized = message.toLowerCase();

      if (normalized.includes('failed to fetch') || normalized.includes('networkerror') || normalized.includes('authretryablefetcherror')) {
        await supabase.auth.signOut({ scope: 'local' });
        return { success: false, error: 'Network issue while restoring session. Please sign in again.' };
      }

      return { success: false, error: message };
    }
  },
};

// Patients API
export const patientsApi = {
  getAll: async (page = 1, pageSize = 50): Promise<ApiResponse<Patient[]>> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('isActive', true)
      .order('admittedAt', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Patient[] };
  },

  getById: async (id: string): Promise<ApiResponse<Patient>> => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Patient };
  },

  create: async (patient: Omit<Patient, 'id' | 'admittedAt'>): Promise<ApiResponse<Patient>> => {
    const { data, error } = await supabase
      .from('patients')
      .insert([patient])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Patient };
  },

  update: async (id: string, updates: Partial<Patient>): Promise<ApiResponse<Patient>> => {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Patient };
  },

  discharge: async (id: string): Promise<ApiResponse<Patient>> => {
    const { data, error } = await supabase
      .from('patients')
      .update({
        isActive: false,
        dischargedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Patient };
  },
};

// Prescriptions API
export const prescriptionsApi = {
  getAll: async (page = 1, pageSize = 50): Promise<ApiResponse<Prescription[]>> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('isActive', true)
      .order('prescribedAt', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Prescription[] };
  },

  getByPatient: async (patientId: string): Promise<ApiResponse<Prescription[]>> => {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patientId', patientId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Prescription[] };
  },

  create: async (prescription: Omit<Prescription, 'id' | 'prescribedAt'>): Promise<ApiResponse<Prescription>> => {
    const { data, error } = await supabase
      .from('prescriptions')
      .insert([prescription])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Prescription };
  },
};

// Schedule Entries API
export const scheduleApi = {
  getToday: async (page = 1, pageSize = 100): Promise<ApiResponse<ScheduleEntry[]>> => {
    const today = new Date().toISOString().split('T')[0];
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('scheduledDate', today)
      .order('scheduledTime', { ascending: true })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as ScheduleEntry[] };
  },

  getByPatient: async (patientId: string): Promise<ApiResponse<ScheduleEntry[]>> => {
    const { data, error } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('patientId', patientId)
      .order('scheduledDate', { ascending: true })
      .order('scheduledTime', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as ScheduleEntry[] };
  },

  acknowledge: async (id: string, nurseId: string, nurseName: string, notifyPatient: boolean): Promise<ApiResponse<ScheduleEntry>> => {
    const { data, error } = await supabase
      .from('schedule_entries')
      .update({
        status: 'given',
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: nurseId,
        acknowledgedByName: nurseName,
        notificationSent: notifyPatient,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as ScheduleEntry };
  },

  markMissed: async (id: string): Promise<ApiResponse<ScheduleEntry>> => {
    const { data, error } = await supabase
      .from('schedule_entries')
      .update({
        status: 'missed',
        escalatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as ScheduleEntry };
  },
};

// Nurse Reminders API
export const nurseRemindersApi = {
  getAll: async (page = 1, pageSize = 50): Promise<ApiResponse<NursePatientReminder[]>> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('nurse_reminders')
      .select('*')
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as NursePatientReminder[] };
  },

  create: async (reminder: Omit<NursePatientReminder, 'id' | 'createdAt' | 'deliveryStatus'>): Promise<ApiResponse<NursePatientReminder>> => {
    const tryInsert = async (payload: Record<string, unknown>) =>
      supabase
        .from('nurse_reminders')
        .insert([payload])
        .select()
        .single();

    const fullPayload = reminder as unknown as Record<string, unknown>;
    const { startDate: _startDate, endDate: _endDate, ...compactPayload } = fullPayload;

    const { data, error } = await tryInsert(compactPayload);

    if (!error) {
      return { success: true, data: data as NursePatientReminder };
    }

    const dateColumnsRequired =
      error.message.includes('null value in column "startDate"') ||
      error.message.includes('null value in column "endDate"') ||
      error.message.includes('null value in column "start_date"') ||
      error.message.includes('null value in column "end_date"') ||
      error.message.toLowerCase().includes('violates not-null constraint');

    if (!dateColumnsRequired) {
      return { success: false, error: error.message };
    }

    const { data: fallbackData, error: fallbackError } = await tryInsert(fullPayload);

    if (fallbackError) return { success: false, error: fallbackError.message };
    return { success: true, data: fallbackData as NursePatientReminder };
  },

  sendNow: async (id: string): Promise<ApiResponse<NursePatientReminder>> => {
    const { data, error } = await supabase.functions.invoke('send-patient-reminder', {
      body: { reminderId: id },
    });

    if (error) return { success: false, error: error.message };
    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to send reminder message' };
    }

    return { success: true, data: data.reminder as NursePatientReminder };
  },

  runDueNow: async (limit = 200): Promise<ApiResponse<Pick<ProcessDueRemindersResult, 'scanned' | 'sent' | 'failed' | 'failures'>>> => {
    const safeLimit = Math.max(1, Math.min(200, Number.isFinite(limit) ? limit : 200));

    const { data, error } = await supabase.functions.invoke('process-due-reminders', {
      body: { limit: safeLimit, source: 'manual-ui' },
    });

    if (error) return { success: false, error: error.message };

    const result = data as ProcessDueRemindersResult | null;
    if (!result?.success) {
      return { success: false, error: result?.error || 'Failed to process due reminders' };
    }

    return {
      success: true,
      data: {
        scanned: result.scanned ?? 0,
        sent: result.sent ?? 0,
        failed: result.failed ?? 0,
        failures: Array.isArray(result.failures) ? result.failures : [],
      },
    };
  },

  /**
   * Get active (non-cleared) reminders for the current user.
   * Shows only reminders that haven't been archived/cleared from view.
   */
  getActive: async (page = 1, pageSize = 50): Promise<ApiResponse<NursePatientReminder[]>> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('nurse_reminders')
      .select('*')
      .is('clearedAt', null)
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as NursePatientReminder[] };
  },

  /**
   * Get reminder history for the current user.
   * Includes both manually cleared reminders and completed reminders.
   */
  getHistory: async (page = 1, pageSize = 50): Promise<ApiResponse<NursePatientReminder[]>> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('nurse_reminders')
      .select('*')
      .or('clearedAt.not.is.null,deliveryStatus.in.(sent,delivered,failed,cancelled)')
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as NursePatientReminder[] };
  },

  /**
   * Mark a single reminder as cleared and move to history.
   * Tracks who cleared it and when for audit purposes.
   */
  markAsCleared: async (reminderId: string, clearedByUserId: string, clearedByName: string): Promise<ApiResponse<NursePatientReminder>> => {
    const { data, error } = await supabase
      .from('nurse_reminders')
      .update({
        clearedAt: new Date().toISOString(),
        clearedBy: clearedByUserId,
        clearedByName,
      })
      .eq('id', reminderId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as NursePatientReminder };
  },

  /**
   * Mark all active (non-cleared) reminders as cleared in bulk.
   * Used for "Clear All History" action for professional record keeping.
   * Returns count of reminders cleared.
   */
  markAllAsCleared: async (clearedByUserId: string, clearedByName: string): Promise<ApiResponse<{ cleared: number }>> => {
    const now = new Date().toISOString();

    const { data: updatedRows, error } = await supabase
      .from('nurse_reminders')
      .update({
        clearedAt: now,
        clearedBy: clearedByUserId,
        clearedByName,
      })
      .is('clearedAt', null)
      .select('id');

    if (error) return { success: false, error: error.message };
    return { success: true, data: { cleared: updatedRows?.length ?? 0 } };
  },
};

// Escalations API
export const escalationsApi = {
  getOpen: async (page = 1, pageSize = 50): Promise<ApiResponse<Escalation[]>> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('escalations')
      .select('*')
      .eq('status', 'open')
      .order('escalatedAt', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Escalation[] };
  },

  resolve: async (id: string, resolvedBy: string): Promise<ApiResponse<Escalation>> => {
    const { data, error } = await supabase
      .from('escalations')
      .update({
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
        resolvedBy,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Escalation };
  },
};

// Message Templates API
export const templatesApi = {
  getAll: async (): Promise<ApiResponse<MessageTemplate[]>> => {
    const { data, error } = await supabase.from('message_templates').select('*');
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as MessageTemplate[] };
  },

  getById: async (id: string): Promise<ApiResponse<MessageTemplate>> => {
    const { data, error } = await supabase.from('message_templates').select('*').eq('id', id).single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as MessageTemplate };
  },

  create: async (template: Omit<MessageTemplate, 'id'>): Promise<ApiResponse<MessageTemplate>> => {
    const { data, error } = await supabase.from('message_templates').insert([template]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as MessageTemplate };
  },
};

// Wards API
export const wardsApi = {
  getAll: async (): Promise<ApiResponse<Ward[]>> => {
    const { data, error } = await supabase.from('wards').select('*');
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Ward[] };
  },

  getById: async (id: string): Promise<ApiResponse<Ward>> => {
    const { data, error } = await supabase.from('wards').select('*').eq('id', id).single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Ward };
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const today = new Date().toISOString().split('T')[0];
    
    const [patientsCount, prescriptionsCount, todayDoses, ackTimes] = await Promise.all([
      supabase.from('patients').select('*', { count: 'exact', head: true }).eq('isActive', true),
      supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('isActive', true),
      supabase.from('schedule_entries').select('status').eq('scheduledDate', today),
      supabase.from('schedule_entries')
        .select('scheduledTime, acknowledgedAt')
        .eq('scheduledDate', today)
        .eq('status', 'given')
        .not('acknowledgedAt', 'is', null),
    ]);

    const doses = todayDoses.data || [];
    const givenDoses = doses.filter(d => d.status === 'given').length;
    const missedDoses = doses.filter(d => d.status === 'missed').length;
    const pendingDoses = doses.filter(d => d.status === 'pending').length;

    // Calculate real escalation rate
    const totalResolved = givenDoses + missedDoses;
    const escalationRate = totalResolved > 0
      ? Math.round((missedDoses / totalResolved) * 1000) / 10
      : 0;

    // Calculate real average acknowledgement time in minutes
    let avgAcknowledgementTime = 0;
    const ackRows = ackTimes.data || [];
    if (ackRows.length > 0) {
      let totalMinutes = 0;
      let validCount = 0;
      for (const row of ackRows) {
        if (!row.acknowledgedAt || !row.scheduledTime) continue;
        const ackDate = new Date(row.acknowledgedAt as string);
        const [hours, minutes] = (row.scheduledTime as string).split(':').map(Number);
        const scheduledDate = new Date(ackDate);
        scheduledDate.setHours(hours, minutes, 0, 0);
        const diffMs = ackDate.getTime() - scheduledDate.getTime();
        if (diffMs >= 0) {
          totalMinutes += diffMs / 60000;
          validCount++;
        }
      }
      avgAcknowledgementTime = validCount > 0
        ? Math.round((totalMinutes / validCount) * 10) / 10
        : 0;
    }

    return {
      success: true,
      data: {
        totalPatients: patientsCount.count || 0,
        totalPrescriptions: prescriptionsCount.count || 0,
        todayReminders: doses.length,
        givenDoses,
        pendingDoses,
        missedDoses,
        avgAcknowledgementTime,
        escalationRate,
      },
    };
  },

  getWardStats: async (): Promise<ApiResponse<WardStats[]>> => {
    const { data, error } = await supabase.from('ward_stats').select('*');
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as WardStats[] };
  },
};

// System API
let systemConfigTableAvailable: boolean | null = null;

const isSystemConfigMissingError = (error: { code?: string; message?: string; status?: number } | null) => {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  return (
    error.status === 404 ||
    error.code === 'PGRST205' ||
    (message.includes('system_config') && (message.includes('schema cache') || message.includes('does not exist') || message.includes('not found')))
  );
};

export const systemApi = {
  getConfig: async (): Promise<ApiResponse<Record<string, any>>> => {
    if (systemConfigTableAvailable === false) {
      return { success: true, data: {} };
    }

    const { data, error } = await supabase.from('system_config').select('*');
    if (error) {
      if (isSystemConfigMissingError(error)) {
        systemConfigTableAvailable = false;
        return { success: true, data: {} };
      }
      return { success: false, error: error.message };
    }

    systemConfigTableAvailable = true;
    
    const config = (data || []).reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    
    return { success: true, data: config };
  },

  updateConfig: async (key: string, value: any): Promise<ApiResponse<void>> => {
    if (systemConfigTableAvailable === false) {
      return { success: false, error: 'System configuration table is not available. Run supabase/scripts/system_config.sql in your database.' };
    }

    const { error } = await supabase
      .from('system_config')
      .upsert({ key, value, updatedAt: new Date().toISOString() });

    if (error) {
      if (isSystemConfigMissingError(error)) {
        systemConfigTableAvailable = false;
        return { success: false, error: 'System configuration table is not available. Run supabase/scripts/system_config.sql in your database.' };
      }
      return { success: false, error: error.message };
    }

    systemConfigTableAvailable = true;
    return { success: true };
  }
};

// Logs API
export const logsApi = {
  getAll: async (page: number = 1, pageSize: number = 20): Promise<ApiResponse<any[]>> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(from, to);
      
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [], count: count || 0 };
  }
};

// Notifications & Real-time Sync API
export const notificationsApi = {
  subscribe: (callback: (notification: NotificationPayload) => void) => {
    const channel = supabase
      .channel('hospital-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        callback(payload.new as NotificationPayload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Real-time sync for all major tables
  subscribeToAll: (
    onPatientChange: (payload: RealtimeChangePayload) => void,
    onScheduleChange: (payload: RealtimeChangePayload) => void,
    onEscalationChange: (payload: RealtimeChangePayload) => void
  ) => {
    const channel = supabase
      .channel('hospital-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, onPatientChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_entries' }, onScheduleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalations' }, onEscalationChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
