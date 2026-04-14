import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Loader2, 
  Save, 
  History,
  Users,
  MessageSquare,
  Settings as SettingsIcon,
  Plus,
  CheckCircle,
  XCircle,
  User,
  Shield,
  Stethoscope,
  UserCog 
} from 'lucide-react';
import { useDataStore, useAuthStore } from '@/store/useStore';
import { systemApi, templatesApi } from '@/services/api';
import { AuditLogs } from './AuditLogs';
import type { TemplateCategory, UserRole } from '@/types';
import { nurseRemindersApi } from '@/services/api';

export function Settings() {
  const { messageTemplates, users, nurseReminders, setMessageTemplates, setNurseReminders } = useDataStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const canEditSettings = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('users');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    bodyEn: '',
    bodyTa: '',
    bodyHi: '',
    category: 'medication' as TemplateCategory,
    variables: '',
  });
  const [config, setConfig] = useState<Record<string, any>>({
    escalation_timeout: 10,
    notification_retries: 3,
    max_reminders_per_patient: 10,
    sms_fallback_enabled: true,
  });

  useEffect(() => {
    if (!canEditSettings || activeTab !== 'system') {
      return;
    }

    const loadConfig = async () => {
      try {
        const res = await systemApi.getConfig();
        if (res.success && res.data) {
          setConfig(prev => ({ ...prev, ...res.data }));
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    loadConfig();
  }, [activeTab, canEditSettings]);

  useEffect(() => {
    if (!canEditSettings) return;

    const loadReminderDiagnostics = async () => {
      const res = await nurseRemindersApi.getAll(1, 200);
      if (res.success && res.data) {
        setNurseReminders(res.data);
      }
    };

    loadReminderDiagnostics();
  }, [canEditSettings, setNurseReminders]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const results = await Promise.all(
        Object.entries(config).map(([key, value]) => systemApi.updateConfig(key, value))
      );
      
      if (results.every(r => r.success)) {
        toast.success('Settings updated', {
          description: 'All system configurations have been saved successfully.'
        });
      } else {
        toast.error('Partial failure', {
          description: 'Some settings could not be saved. Please check your permissions.'
        });
      }
    } catch (error) {
      toast.error('Save failed', {
        description: 'An error occurred while saving settings.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'doctor':
        return <Stethoscope className="w-4 h-4" />;
      case 'head_nurse':
        return <UserCog className="w-4 h-4" />;
      case 'nurse':
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'doctor':
        return 'bg-blue-100 text-blue-800';
      case 'head_nurse':
        return 'bg-orange-100 text-orange-800';
      case 'nurse':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleSummary = (role: UserRole) => {
    switch (role) {
      case 'doctor':
        return 'Review patients, prescriptions, and escalation summaries.';
      case 'head_nurse':
        return 'Monitor ward activity, reminders, and care coordination.';
      case 'nurse':
        return 'Manage patient reminders and day-to-day care workflows.';
      default:
        return 'View your role information and system access.';
    }
  };

  const getQuickActions = (role: UserRole) => {
    switch (role) {
      case 'doctor':
        return [
          { title: 'Review Escalations', description: 'Open the escalation list and review urgent patient follow-ups.', path: '/escalations' },
          { title: 'Check Prescriptions', description: 'Go to the prescriptions view to confirm active medication plans.', path: '/prescriptions' },
          { title: 'Patient Overview', description: 'Jump to the patients view to review wards and patient status.', path: '/patients' },
        ];
      case 'head_nurse':
        return [
          { title: 'Ward Coordination', description: 'Monitor assigned wards and team activity at a glance.', path: '/dashboard' },
          { title: 'Send Reminder', description: 'Create or dispatch reminders for patient care tasks.', path: '/nurse-reminders' },
          { title: 'Review Escalations', description: 'Check urgent cases and respond to missed doses quickly.', path: '/escalations' },
        ];
      case 'nurse':
        return [
          { title: 'Send Reminder', description: 'Create a patient reminder or send one immediately.', path: '/nurse-reminders' },
          { title: 'Pending Reminders', description: 'Review your active reminder queue and follow-ups.', path: '/reminders' },
          { title: 'Patient Lookup', description: 'Open patients to quickly find the correct ward and bed.', path: '/patients' },
        ];
      default:
        return [];
    }
  };

  const getReminderTemplates = (role: UserRole) => {
    if (role !== 'nurse' && role !== 'head_nurse') return [];

    return messageTemplates
      .filter((template) => template.category === 'medication' || template.category === 'procedure' || template.category === 'discharge')
      .slice(0, 4);
  };

  const failedReminders = nurseReminders.filter((reminder) => reminder.deliveryStatus === 'failed');
  const pendingReminders = nurseReminders.filter((reminder) => reminder.deliveryStatus === 'pending');
  const sentReminders = nurseReminders.filter((reminder) => reminder.deliveryStatus === 'sent' || reminder.deliveryStatus === 'delivered');

  const extractFailureReason = (note?: string | null) => {
    if (!note) return 'Unknown failure';
    const match = note.match(/(?:Delivery failed|Partial delivery):\s*(.*)$/i);
    return match?.[1]?.trim() || note;
  };

  const failureReasonCounts = failedReminders.reduce<Record<string, number>>((accumulator, reminder) => {
    const reason = extractFailureReason(reminder.lastError || reminder.internalNote);
    accumulator[reason] = (accumulator[reason] || 0) + 1;
    return accumulator;
  }, {});

  const topFailureReasons = Object.entries(failureReasonCounts)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 5);

  const formatTimingDelta = (scheduledAt?: string, sentAt?: string) => {
    if (!scheduledAt || !sentAt) return 'No timing data';

    const scheduled = new Date(scheduledAt);
    const sent = new Date(sentAt);
    if (Number.isNaN(scheduled.getTime()) || Number.isNaN(sent.getTime())) return 'Invalid timing data';

    const deltaMinutes = Math.round((sent.getTime() - scheduled.getTime()) / 60000);
    if (deltaMinutes === 0) return 'Sent on time';
    if (deltaMinutes > 0) return `Sent ${deltaMinutes} min late`;
    return `Sent ${Math.abs(deltaMinutes)} min early`;
  };

  const handleCreateTemplate = async () => {
    if (!user || (user.role !== 'nurse' && user.role !== 'head_nurse')) return;
    if (!newTemplate.name.trim() || !newTemplate.bodyEn.trim()) {
      toast.error('Missing fields', {
        description: 'Template name and English body are required.',
      });
      return;
    }

    setIsCreatingTemplate(true);
    try {
      const payload = {
        name: newTemplate.name.trim().toLowerCase().replace(/\s+/g, '_'),
        bodyEn: newTemplate.bodyEn.trim(),
        bodyTa: newTemplate.bodyTa.trim() || newTemplate.bodyEn.trim(),
        bodyHi: newTemplate.bodyHi.trim() || newTemplate.bodyEn.trim(),
        metaApproved: false,
        category: newTemplate.category,
        variables: newTemplate.variables
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      };

      const result = await templatesApi.create(payload);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create template');
      }

      setMessageTemplates([...(messageTemplates || []), result.data]);
      setNewTemplate({
        name: '',
        bodyEn: '',
        bodyTa: '',
        bodyHi: '',
        category: 'medication',
        variables: '',
      });
      setShowTemplateForm(false);
      toast.success('Template created', {
        description: 'Your reminder template is now available in the list.',
      });
    } catch (error) {
      toast.error('Create failed', {
        description: error instanceof Error ? error.message : 'Unable to create template.',
      });
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  if (!canEditSettings) {
    const role = user?.role || 'nurse';

    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-500 mt-1">
            Simplified account view for your role
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500">Name</p>
                <p className="mt-1 font-medium text-gray-900">{user?.name || 'Unknown'}</p>
              </div>
              <div className="p-4 rounded-lg border bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500">Role</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className={getRoleBadgeColor(role)}>
                    {role.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
                <p className="mt-1 font-medium text-gray-900">{user?.email || 'Not available'}</p>
              </div>
              <div className="p-4 rounded-lg border bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500">Ward</p>
                <p className="mt-1 font-medium text-gray-900">{user?.ward || 'Not assigned'}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
              <p className="text-sm font-semibold text-blue-900">Role Summary</p>
              <p className="text-sm text-blue-800 mt-1">{getRoleSummary(role)}</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {getQuickActions(role).map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className="text-left rounded-lg border bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {(role === 'nurse' || role === 'head_nurse') && (
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-gray-900">Reminder Templates</p>
                  <Button size="sm" variant="outline" onClick={() => setShowTemplateForm((prev) => !prev)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                  </Button>
                </div>

                {showTemplateForm && (
                  <Card className="mb-4 border-blue-200 bg-blue-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Create Reminder Template</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="templateName">Template Name</Label>
                          <Input
                            id="templateName"
                            value={newTemplate.name}
                            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                            placeholder="medication_reminder"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="templateCategory">Category</Label>
                          <select
                            id="templateCategory"
                            value={newTemplate.category}
                            onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as TemplateCategory })}
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="medication">Medication</option>
                            <option value="procedure">Procedure</option>
                            <option value="discharge">Discharge</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bodyEn">English Message</Label>
                        <Textarea
                          id="bodyEn"
                          value={newTemplate.bodyEn}
                          onChange={(e) => setNewTemplate({ ...newTemplate, bodyEn: e.target.value })}
                          placeholder="Your medication is due. Please take it on time."
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bodyTa">Tamil Message</Label>
                          <Textarea
                            id="bodyTa"
                            value={newTemplate.bodyTa}
                            onChange={(e) => setNewTemplate({ ...newTemplate, bodyTa: e.target.value })}
                            placeholder="English will be used if empty"
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bodyHi">Hindi Message</Label>
                          <Textarea
                            id="bodyHi"
                            value={newTemplate.bodyHi}
                            onChange={(e) => setNewTemplate({ ...newTemplate, bodyHi: e.target.value })}
                            placeholder="English will be used if empty"
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="variables">Variables</Label>
                        <Input
                          id="variables"
                          value={newTemplate.variables}
                          onChange={(e) => setNewTemplate({ ...newTemplate, variables: e.target.value })}
                          placeholder="medicine_name, dose, instruction"
                        />
                        <p className="text-xs text-gray-500">Comma separated variables, optional.</p>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowTemplateForm(false)}
                          disabled={isCreatingTemplate}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleCreateTemplate} disabled={isCreatingTemplate}>
                          {isCreatingTemplate ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Template'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getReminderTemplates(role).map((template) => (
                    <div key={template.id} className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                          <p className="font-medium text-gray-900 capitalize">{template.name.replace('_', ' ')}</p>
                        </div>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3">{template.bodyEn}</p>
                      <div className="flex justify-between items-center gap-2">
                        <Badge variant={template.metaApproved ? 'default' : 'secondary'}>
                          {template.metaApproved ? 'Approved' : 'Pending'}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/nurse-reminders?templateId=${template.id}`)}>
                          Use Template
                        </Button>
                      </div>
                    </div>
                  ))}

                  {getReminderTemplates(role).length === 0 && (
                    <div className="rounded-lg border bg-white p-4 shadow-sm text-sm text-gray-500 md:col-span-2">
                      No reminder templates available yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              This view is simplified for doctors, nurses, and head nurses. System-wide settings remain admin-only.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 mt-1">
          Manage users, templates, and system configuration
        </p>
        {!canEditSettings && (
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            View-only mode: your role can see settings, but only admins can edit system configuration.
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>Reminder Health</span>
              <Badge variant="outline" className="font-mono">
                {failedReminders.length} failed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border bg-white p-3">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{pendingReminders.length}</p>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Sent</p>
                <p className="text-2xl font-semibold text-gray-900">{sentReminders.length}</p>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Failed</p>
                <p className="text-2xl font-semibold text-gray-900">{failedReminders.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">Top Failure Reasons</p>
                {topFailureReasons.length > 0 ? (
                  <div className="space-y-2">
                    {topFailureReasons.map(([reason, count]) => (
                      <div key={reason} className="flex items-start justify-between gap-3 text-sm">
                        <span className="text-gray-700">{reason}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No failures recorded yet.</p>
                )}
              </div>

              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">Recent Sent Reminders</p>
                {sentReminders.length > 0 ? (
                  <div className="space-y-3 max-h-56 overflow-auto pr-1">
                    {sentReminders.slice(0, 5).map((reminder) => (
                      <div key={reminder.id} className="rounded-md border bg-gray-50 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{reminder.patientName}</p>
                            <p className="text-xs text-gray-500">{reminder.scheduledAt || 'No scheduled time'}</p>
                          </div>
                          <Badge variant="secondary">{reminder.deliveryStatus}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-gray-600">
                          {formatTimingDelta(reminder.scheduledAt, reminder.sentAt)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Sent at {reminder.sentAt ? new Date(reminder.sentAt).toLocaleString() : 'Unknown'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No sent reminders to review yet.</p>
                )}
              </div>

              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">Recent Failed Reminders</p>
                {failedReminders.length > 0 ? (
                  <div className="space-y-3 max-h-56 overflow-auto pr-1">
                    {failedReminders.slice(0, 5).map((reminder) => (
                      <div key={reminder.id} className="rounded-md border bg-gray-50 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{reminder.patientName}</p>
                            <p className="text-xs text-gray-500">{reminder.patientPhone}</p>
                          </div>
                          <Badge variant="destructive">Failed</Badge>
                        </div>
                        <p className="mt-2 text-xs text-gray-600">{extractFailureReason(reminder.lastError || reminder.internalNote)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No failed reminders to review.</p>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500">
              This panel reads from the reminder table and helps you catch Twilio auth, sender format, and phone-number issues early.
            </p>
          </CardContent>
        </Card>

        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="templates">
            <MessageSquare className="w-4 h-4 mr-2" />
            Message Templates
          </TabsTrigger>
          <TabsTrigger value="system">
            <SettingsIcon className="w-4 h-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="w-4 h-4 mr-2" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Management</CardTitle>
              <Button size="sm" disabled={!canEditSettings}>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            {getRoleIcon(u.role)}
                          </div>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(u.role)}>
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{u.phone}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? 'default' : 'secondary'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {u.lastLogin
                            ? new Date(u.lastLogin).toLocaleDateString()
                            : 'Never'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Message Templates</CardTitle>
              <Button size="sm" disabled={!canEditSettings}>
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messageTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold capitalize">
                          {template.name.replace('_', ' ')}
                        </span>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <Badge
                        variant={template.metaApproved ? 'default' : 'secondary'}
                      >
                        {template.metaApproved ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Meta Approved
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Pending
                          </>
                        )}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500 mb-1">English</p>
                        <p className="text-sm">{template.bodyEn}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500 mb-1">Tamil</p>
                        <p className="text-sm">{template.bodyTa}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500 mb-1">Hindi</p>
                        <p className="text-sm">{template.bodyHi}</p>
                      </div>
                    </div>

                    {template.variables.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Variables:</span>
                        {template.variables.map((variable) => (
                          <Badge key={variable} variant="secondary">
                            {'{' + variable + '}'}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="escalationTimeout">
                    Escalation Timeout (minutes)
                  </Label>
                  <Input
                    id="escalationTimeout"
                    type="number"
                    value={config.escalation_timeout}
                    onChange={(e) => setConfig({ ...config, escalation_timeout: parseInt(e.target.value) })}
                    min={5}
                    max={30}
                  />
                  <p className="text-xs text-gray-500">
                    Time before a missed dose is escalated to Head Nurse
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notificationRetry">
                    Notification Retry Attempts
                  </Label>
                  <Input
                    id="notificationRetry"
                    type="number"
                    value={config.notification_retries}
                    onChange={(e) => setConfig({ ...config, notification_retries: parseInt(e.target.value) })}
                    min={1}
                    max={5}
                  />
                  <p className="text-xs text-gray-500">
                    Number of retry attempts for failed notifications
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxRemindersPerPatient">
                    Max Active Reminders per Patient
                  </Label>
                  <Input
                    id="maxRemindersPerPatient"
                    type="number"
                    value={config.max_reminders_per_patient}
                    onChange={(e) => setConfig({ ...config, max_reminders_per_patient: parseInt(e.target.value) })}
                    min={5}
                    max={20}
                  />
                  <p className="text-xs text-gray-500">
                    Maximum number of scheduled reminders per patient
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smsFallback">
                    Enable SMS Fallback
                  </Label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="smsFallback"
                      type="checkbox"
                      checked={config.sms_fallback_enabled}
                      onChange={(e) => setConfig({ ...config, sms_fallback_enabled: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">
                      Send SMS when WhatsApp fails
                    </span>
                  </div>
                </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-4 text-gray-900">System Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-gray-500 block text-xs uppercase font-semibold">Version</span>
                    <span className="text-gray-900 font-medium tracking-tight">3.0.0-prod</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-gray-500 block text-xs uppercase font-semibold">Database</span>
                    <span className="text-gray-900 font-medium tracking-tight">Supabase PG-15</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-gray-500 block text-xs uppercase font-semibold">Provider</span>
                    <span className="text-gray-900 font-medium tracking-tight">Twilio</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-gray-500 block text-xs uppercase font-semibold">Environment</span>
                    <span className="text-gray-900 font-medium tracking-tight">Enterprise Edition</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveConfig} 
                  disabled={isSaving || !canEditSettings}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
