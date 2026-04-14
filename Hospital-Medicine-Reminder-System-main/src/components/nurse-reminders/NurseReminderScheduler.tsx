import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { nurseRemindersApi, templatesApi, patientsApi } from '@/services/api';
import { useDataStore, useAuthStore } from '@/store/useStore';
import {
  Send,
  Search,
  Clock,
  MessageSquare,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  AlertCircle,
  Phone,
  Languages,
  Repeat,
  Plus,
  X,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatTimeToAmPm } from '@/lib/utils';
import type { NursePatientReminder, MessageTemplate, Patient, Language, NotificationChannel, RecurrenceType } from '@/types';
import { toast } from 'sonner';

export function NurseReminderScheduler() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { nurseReminders, messageTemplates, patients, setNurseReminders, setMessageTemplates, setPatients, addNurseReminder, updateNurseReminder } = useDataStore();
  
  const [, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('compose');
  const [step, setStep] = useState(1);
  const [showingHistory, setShowingHistory] = useState(false);
    const [historyReminders, setHistoryReminders] = useState<NursePatientReminder[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    // Fetch history reminders when viewing history
    useEffect(() => {
      if (showingHistory) {
        loadHistoryReminders();
      }
    }, [showingHistory]);

    const loadHistoryReminders = async () => {
      setIsLoadingHistory(true);
      setHistoryError(null);
      try {
        const result = await nurseRemindersApi.getHistory(1, 50);
        if (result.success) {
          setHistoryReminders(result.data || []);
        } else {
          setHistoryError(result.error || 'Failed to load history');
        }
      } catch (error) {
        setHistoryError('Error loading history reminders');
        console.error('Error loading history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  
  // Form state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [channel, setChannel] = useState<NotificationChannel>('whatsapp');
  const [sendNow, setSendNow] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [internalNote, setInternalNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRunningDueNow, setIsRunningDueNow] = useState(false);
  const [runDueNowMessage, setRunDueNowMessage] = useState<string | null>(null);
  const [runDueNowError, setRunDueNowError] = useState<string | null>(null);
  const [lastAppliedTemplateId, setLastAppliedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    // Prefill end date once, but keep it editable by the user.
    if (!sendNow && startDate && !endDate) {
      setEndDate(startDate);
    }
  }, [sendNow, startDate, endDate]);

  useEffect(() => {
    const loadData = async () => {
      if (!navigator.onLine) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [remindersRes, templatesRes, patientsRes] = await Promise.all([
          nurseRemindersApi.getAll(),
          templatesApi.getAll(),
          patientsApi.getAll(),
        ]);

        if (remindersRes.success) setNurseReminders(remindersRes.data!);
        if (templatesRes.success) setMessageTemplates(templatesRes.data!);
        if (patientsRes.success) setPatients(patientsRes.data!);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        const isNetworkIssue =
          message.includes('failed to fetch') ||
          message.includes('network') ||
          message.includes('internet disconnected') ||
          message.includes('connection closed');

        if (!isNetworkIssue) {
          console.error('Error loading data:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    const interval = setInterval(loadData, 60000);
    const onOnline = () => {
      loadData();
    };

    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
    };
  }, [setNurseReminders, setMessageTemplates, setPatients]);

  useEffect(() => {
    const templateId = new URLSearchParams(location.search).get('templateId');
    if (!templateId || templateId === lastAppliedTemplateId) return;

    const matched = messageTemplates.find((template) => template.id === templateId);
    if (!matched) return;

    setSelectedTemplate(matched);
    setActiveTab('compose');
    setStep(2);
    setLastAppliedTemplateId(templateId);
  }, [location.search, messageTemplates, lastAppliedTemplateId]);

  const filteredPatients = patients.filter(
    (p) =>
      p.isActive &&
      (p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.phone.includes(patientSearch) ||
        p.ward.toLowerCase().includes(patientSearch.toLowerCase()))
  );
  const pendingScheduledReminders = nurseReminders.filter((reminder) => reminder.deliveryStatus === 'pending');

  const getTemplateMessage = (template: MessageTemplate, lang: Language) => {
    switch (lang) {
      case 'ta':
        return template.bodyTa;
      case 'hi':
        return template.bodyHi;
      default:
        return template.bodyEn;
    }
  };

  const getPreviewMessage = () => {
    if (selectedTemplate) {
      if (selectedTemplate.name === 'custom') {
        return customMessage;
      }
      // For demo, return template with sample values
      let message = getTemplateMessage(selectedTemplate, language);
      message = message.replace('{medicine_name}', 'Metformin');
      message = message.replace('{dose}', '500mg');
      message = message.replace('{instruction}', 'after dinner');
      message = message.replace('{time}', 'midnight');
      message = message.replace('{location}', 'Ward 2A reception');
      message = message.replace('{date}', 'Jan 25, 2025');
      message = message.replace('{custom_message}', customMessage);
      return message;
    }
    return customMessage;
  };

  const handleAddTime = () => {
    if (!newTime || selectedTimes.includes(newTime)) return;
    setSelectedTimes((prev) => [...prev, newTime].sort());
    setNewTime('');
  };

  const handleRemoveTime = (time: string) => {
    setSelectedTimes((prev) => prev.filter((t) => t !== time));
  };

  const toE164Phone = (rawPhone: string) => {
    const cleaned = rawPhone.replace(/[^\d+]/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;

    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      return `+91${digitsOnly}`;
    }

    return `+${digitsOnly}`;
  };

  /**
   * Convert local date+time to UTC ISO string for database storage.
   * The browser's local timezone is used for interpretation.
   * This ensures reminders fire at the exact local time intended.
   */
  const localToUTC = (dateStr: string, timeStr: string): string => {
    // Create a date string in local timezone interpretation
    const localDateTimeStr = `${dateStr}T${timeStr}:00`;
    
    // Parse as local time and convert to UTC ISO string
    const localDate = new Date(localDateTimeStr);
    
    // Validate the date
    if (isNaN(localDate.getTime())) {
      console.warn(`Invalid date/time: ${dateStr} ${timeStr}`);
      return new Date().toISOString();
    }

    // Return UTC ISO string
    return localDate.toISOString();
  };

  const handleSubmit = async () => {
    if (!user || !selectedPatient) return;

    if (!sendNow) {
      if (!startDate || !endDate || selectedTimes.length === 0) {
        setSubmitError('Please select a start date, end date, and at least one time.');
        setStep(3);
        return;
      }

      if (new Date(endDate) < new Date(startDate)) {
        setSubmitError('End date cannot be earlier than start date.');
        setStep(3);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const timesToUse = sendNow ? ['now'] : selectedTimes;

      for (const time of timesToUse) {
        // Convert local browser time to UTC ISO for database
        const scheduledAt = sendNow
          ? new Date().toISOString()
          : localToUTC(startDate, time);

        const reminderData: Omit<NursePatientReminder, 'id' | 'createdAt' | 'deliveryStatus'> = {
          patientId: selectedPatient.id,
          patientName: selectedPatient.fullName,
          patientPhone: toE164Phone(selectedPatient.whatsappNumber || selectedPatient.phone),
          nurseId: user.id,
          nurseName: user.name,
          messageBody: getPreviewMessage(),
          templateId: selectedTemplate?.id,
          templateName: selectedTemplate?.name,
          language,
          channel,
          startDate: sendNow ? new Date().toISOString().split('T')[0] : startDate,
          endDate: sendNow ? new Date().toISOString().split('T')[0] : endDate,
          scheduledAt,
          recurrence,
          internalNote,
        };

        const response = await nurseRemindersApi.create(reminderData);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to create reminder');
        }

        addNurseReminder(response.data);

        if (sendNow) {
          const sendResponse = await nurseRemindersApi.sendNow(response.data.id);
          if (!sendResponse.success || !sendResponse.data) {
            throw new Error(sendResponse.error || 'Reminder created, but message could not be sent');
          }
          updateNurseReminder(sendResponse.data.id, sendResponse.data);
        }
      }

      resetForm();
      setActiveTab('scheduled');
    } catch (error) {
      console.error('Error creating reminder:', error);
      setSubmitError(error instanceof Error ? error.message : 'Unable to send reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedPatient(null);
    setPatientSearch('');
    setSelectedTemplate(null);
    setCustomMessage('');
    setLanguage('en');
    setChannel('whatsapp');
    setSendNow(false);
    setStartDate('');
    setEndDate('');
    setSelectedTimes([]);
    setNewTime('');
    setRecurrence('none');
    setInternalNote('');
  };

  const handleClearCompose = () => {
    setSubmitError(null);
    resetForm();
  };

  const handleClearAllHistory = async () => {
    if (!user) return;

    setIsClearing(true);
    try {
      const clearResponse = await nurseRemindersApi.markAllAsCleared(user.id, user.name);
      if (!clearResponse.success || !clearResponse.data) {
        throw new Error(clearResponse.error || 'Failed to clear reminders');
      }

      toast.success('History Cleared', {
        description: `Archived ${clearResponse.data.cleared} reminder${clearResponse.data.cleared !== 1 ? 's' : ''} to history.`,
      });

      // Refresh the list
      const remindersRes = await nurseRemindersApi.getActive();
      if (remindersRes.success && remindersRes.data) {
        setNurseReminders(remindersRes.data);
      }

      setShowClearConfirmation(false);
    } catch (error) {
      toast.error('Clear Failed', {
        description: error instanceof Error ? error.message : 'Failed to clear reminders',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleRunDueNow = async () => {
    if (user?.role !== 'admin') return;

    setIsRunningDueNow(true);
    setRunDueNowMessage(null);
    setRunDueNowError(null);

    try {
      const processResponse = await nurseRemindersApi.runDueNow(200);
      if (!processResponse.success || !processResponse.data) {
        throw new Error(processResponse.error || 'Unable to process due reminders now');
      }

      const { scanned, sent, failed } = processResponse.data;
      setRunDueNowMessage(`Processed ${scanned} due reminders: ${sent} sent, ${failed} failed.`);

      const remindersRes = await nurseRemindersApi.getAll();
      if (remindersRes.success && remindersRes.data) {
        setNurseReminders(remindersRes.data);
      }
    } catch (error) {
      setRunDueNowError(error instanceof Error ? error.message : 'Unable to process due reminders now');
    } finally {
      setIsRunningDueNow(false);
    }
  };

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <Badge className="bg-indigo-100 text-indigo-800">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case 'delivered':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Delivered
          </Badge>
        );
      case 'sent':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Send className="w-3 h-3 mr-1" />
            Sent
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  const getLanguageLabel = (lang: Language) => {
    const labels: Record<string, string> = {
      en: 'English',
      ta: 'Tamil',
      hi: 'Hindi',
    };
    return labels[lang] || lang;
  };

  const formatReminderDate = (value?: string) => {
    if (!value) return 'Unscheduled';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unscheduled';

    return format(date, 'MMM d, yyyy');
  };

  const getScheduleLabel = (reminder: NursePatientReminder) => {
    const start = reminder.startDate;
    const end = reminder.endDate;

    if (start || end) {
      return `${formatReminderDate(start)} to ${formatReminderDate(end)}`;
    }

    if (reminder.scheduledAt) {
      const scheduledDate = new Date(reminder.scheduledAt);
      if (!Number.isNaN(scheduledDate.getTime())) {
        return `Scheduled ${format(scheduledDate, 'MMM d, yyyy HH:mm')}`;
      }
    }

    return 'Unscheduled';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Send Patient Reminder
        </h2>
        <p className="text-gray-500 mt-1">
          Compose and schedule custom reminders to patients' phones
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compose">Compose Reminder</TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled Reminders ({pendingScheduledReminders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center">
                  <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">
                    {step}
                  </span>
                  {step === 1 && 'Select Patient'}
                  {step === 2 && 'Compose Message'}
                  {step === 3 && 'Schedule Delivery'}
                  {step === 4 && 'Review & Confirm'}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleClearCompose}>
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Step 1: Select Patient */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search patients by name, phone, or ward..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setLanguage(patient.preferredLanguage);
                        }}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPatient?.id === patient.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{patient.fullName}</p>
                              <p className="text-sm text-gray-500">
                                {patient.ward}, Bed {patient.bed} • {patient.phone}
                              </p>
                            </div>
                          </div>
                          {selectedPatient?.id === patient.id && (
                            <CheckCircle className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredPatients.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        No patients found
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!selectedPatient}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Compose Message */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Templates */}
                  <div>
                    <Label className="mb-2 block">Message Templates</Label>
                    <div className="flex flex-wrap gap-2">
                      {messageTemplates.map((template) => (
                        <Button
                          key={template.id}
                          variant={selectedTemplate?.id === template.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedTemplate(template)}
                        >
                          {template.name.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div>
                    <Label className="mb-2 block flex items-center">
                      <Languages className="w-4 h-4 mr-1" />
                      Language
                    </Label>
                    <div className="flex gap-2">
                      {(['en', 'ta', 'hi'] as Language[]).map((lang) => (
                        <Button
                          key={lang}
                          variant={language === lang ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setLanguage(lang)}
                        >
                          {getLanguageLabel(lang)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Message Preview */}
                  {selectedTemplate && selectedTemplate.name !== 'custom' && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Label className="text-sm text-gray-500">Template Preview</Label>
                      <p className="text-sm mt-1">
                        {getTemplateMessage(selectedTemplate, language)}
                      </p>
                    </div>
                  )}

                  {/* Custom Message */}
                  {(selectedTemplate?.name === 'custom' || !selectedTemplate) && (
                    <div>
                      <Label htmlFor="customMessage">Custom Message</Label>
                      <Textarea
                        id="customMessage"
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Enter your custom message..."
                        rows={4}
                        maxLength={160}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {customMessage.length} / 160 characters
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={
                        (selectedTemplate?.name === 'custom' || !selectedTemplate) &&
                        !customMessage.trim()
                      }
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Schedule */}
              {step === 3 && (
                <div className="space-y-4">
                  {/* Send Now / Schedule */}
                  <div>
                    <Label className="mb-2 block">When to Send</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={sendNow ? 'default' : 'outline'}
                        onClick={() => setSendNow(true)}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Now
                      </Button>
                      <Button
                        variant={!sendNow ? 'default' : 'outline'}
                        onClick={() => setSendNow(false)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule
                      </Button>
                    </div>
                  </div>

                  {/* Schedule Date/Time */}
                  {!sendNow && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                  )}

                  {!sendNow && (
                    <div>
                      <Label htmlFor="newTime">Time</Label>
                      <div className="flex gap-2">
                        <Input
                          id="newTime"
                          type="time"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                        />
                        <Button type="button" variant="secondary" onClick={handleAddTime}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 min-h-[40px] p-2 mt-2 bg-gray-50 rounded-md border border-dashed">
                        {selectedTimes.map((time) => (
                          <Badge key={time} className="bg-blue-50 text-blue-700 border-blue-200 gap-1 pr-1.5 py-1">
                            <Clock className="w-3 h-3" /> {formatTimeToAmPm(time)}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveTime(time)} />
                          </Badge>
                        ))}
                        {selectedTimes.length === 0 && (
                          <p className="text-xs text-gray-400 italic m-auto">Add one or more reminder times</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recurrence */}
                  <div>
                    <Label className="mb-2 block flex items-center">
                      <Repeat className="w-4 h-4 mr-1" />
                      Recurrence
                    </Label>
                    <select
                      value={recurrence}
                      onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="none">One-time</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  {/* Channel */}
                  <div>
                    <Label className="mb-2 block flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      Delivery Channel
                    </Label>
                    <div className="flex gap-2">
                      {(['whatsapp', 'sms', 'both'] as NotificationChannel[]).map((ch) => (
                        <Button
                          key={ch}
                          variant={channel === ch ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setChannel(ch)}
                        >
                          {ch.charAt(0).toUpperCase() + ch.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Internal Note */}
                  <div>
                    <Label htmlFor="internalNote">Internal Note (not sent to patient)</Label>
                    <Textarea
                      id="internalNote"
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      placeholder="Add a note for your reference..."
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button
                      onClick={() => {
                        setStep(4);
                      }}
                      disabled={!sendNow && (!startDate || !endDate || selectedTimes.length === 0)}
                    >
                      Review
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Review & Confirm */}
              {step === 4 && (
                <div className="space-y-4">
                  {submitError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">To:</span>
                      <span className="font-medium">{selectedPatient?.fullName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span>{selectedPatient?.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Message:</span>
                      <span className="text-right max-w-xs">{getPreviewMessage()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Language:</span>
                      <span>{getLanguageLabel(language)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Channel:</span>
                      <span className="capitalize">{channel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Schedule (Local Time):</span>
                      <span>
                        {sendNow
                          ? 'Now'
                          : `${startDate} to ${endDate} at ${selectedTimes.map(formatTimeToAmPm).join(', ')}`}
                      </span>
                    </div>

                    {/* Show UTC conversion for verification */}
                    {!sendNow && selectedTimes.length > 0 && (
                      <div className="pt-2 border-t border-gray-200 mt-3">
                        <div className="text-xs text-gray-600 mb-2">
                          📅 <strong>Scheduled UTC Times (for verification):</strong>
                        </div>
                        <div className="space-y-1">
                          {selectedTimes.map((time) => {
                            const utcIso = localToUTC(startDate, time);
                            const utcDate = new Date(utcIso);
                            return (
                              <div key={`${startDate}-${time}`} className="text-xs text-gray-700 ml-4">
                                • {format(utcDate, 'MMM d, yyyy HH:mm')} UTC
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-xs text-gray-500 mt-2 italic">
                          Reminders send at these UTC times. Your browser timezone is automatically applied.
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Recurrence:</span>
                      <span className="capitalize">{recurrence}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Sent by:</span>
                      <span>{user?.name}</span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          {sendNow ? 'Send Now' : 'Schedule Reminder'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Reminders Tab */}
        <TabsContent value="scheduled" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>
                      {showingHistory ? 'Cleared History' : 'Active Reminders'}
                    </CardTitle>
                    <Badge variant="outline">
                      {pendingScheduledReminders.length}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={showingHistory ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowingHistory(!showingHistory)}
                    >
                      {showingHistory ? 'View Active' : 'View History'}
                    </Button>

                    {!showingHistory && pendingScheduledReminders.length > 0 && (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowClearConfirmation(true)}
                          disabled={isClearing}
                        >
                          {isClearing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Clearing...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-2" />
                              Clear All
                            </>
                          )}
                        </Button>

                        {/* Clear Confirmation Dialog */}
                        {showClearConfirmation && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
                            <Card className="w-full max-w-sm">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <AlertCircle className="w-5 h-5 text-amber-600" />
                                  Clear All Reminders?
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <p className="text-sm text-gray-600">
                                  This will archive <strong>{pendingScheduledReminders.length}</strong> active reminder{pendingScheduledReminders.length !== 1 ? 's' : ''} to history. This action is recorded in the audit trail.
                                </p>
                                <p className="text-xs text-gray-500">
                                  ✓ Cleared reminders can be viewed in the History tab
                                  <br />✓ All metadata and delivery status is preserved
                                  <br />✓ Action is logged with your name and timestamp
                                </p>
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowClearConfirmation(false)}
                                    disabled={isClearing}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={handleClearAllHistory}
                                    disabled={isClearing}
                                  >
                                    {isClearing ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Clearing...
                                      </>
                                    ) : (
                                      'Clear All'
                                    )}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </>
                    )}

                    {user?.role === 'admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRunDueNow}
                        disabled={isRunningDueNow}
                      >
                        {isRunningDueNow ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Run Due Reminders Now
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {runDueNowMessage && (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    {runDueNowMessage}
                  </p>
                )}
                {runDueNowError && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {runDueNowError}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                  {showingHistory ? (
                    // History view
                    <>
                      {isLoadingHistory ? (
                        <div className="text-center py-8">
                          <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-spin" />
                          <p className="text-gray-500">Loading history...</p>
                        </div>
                      ) : historyError ? (
                        <div className="text-center py-8">
                          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                          <p className="text-red-700">{historyError}</p>
                        </div>
                      ) : historyReminders.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No reminder history yet</p>
                          <p className="text-sm text-gray-400">
                            Sent, failed, cancelled, or cleared reminders will appear here
                          </p>
                        </div>
                      ) : (
                        historyReminders.map((reminder) => (
                          <div
                            key={reminder.id}
                            className="border rounded-lg p-4 space-y-2 bg-gray-50 opacity-75"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-gray-500" />
                                </div>
                                <div>
                                  <p className="font-semibold">{reminder.patientName}</p>
                                  <p className="text-sm text-gray-500">
                                    {reminder.patientPhone}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {getDeliveryStatusBadge(reminder.deliveryStatus) || (
                                  <span className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded-full font-semibold">
                                    History
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="p-3 bg-white rounded-lg">
                              <p className="text-sm">{reminder.messageBody}</p>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-4">
                                <span className="flex items-center text-gray-500">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  {getScheduleLabel(reminder)}
                                </span>
                                <span className="flex items-center text-gray-500">
                                  <Languages className="w-4 h-4 mr-1" />
                                  {getLanguageLabel(reminder.language)}
                                </span>
                                <span className="flex items-center text-gray-500 capitalize">
                                  <Phone className="w-4 h-4 mr-1" />
                                  {reminder.channel}
                                </span>
                              </div>
                              <span className="text-gray-400">
                                By {reminder.nurseName}
                              </span>
                            </div>

                            {reminder.clearedAt && (
                              <p className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Cleared on {new Date(reminder.clearedAt).toLocaleString()} by {reminder.clearedByName || 'Unknown'}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </>
                  ) : (
                    // Active reminders view
                    <>
                  {pendingScheduledReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`border rounded-lg p-4 space-y-2 ${
                      showingHistory ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{reminder.patientName}</p>
                          <p className="text-sm text-gray-500">
                            {reminder.patientPhone}
                          </p>
                        </div>
                      </div>
                      {getDeliveryStatusBadge(reminder.deliveryStatus)}
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm">{reminder.messageBody}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          {getScheduleLabel(reminder)}
                        </span>
                        <span className="flex items-center text-gray-500">
                          <Languages className="w-4 h-4 mr-1" />
                          {getLanguageLabel(reminder.language)}
                        </span>
                        <span className="flex items-center text-gray-500 capitalize">
                          <Phone className="w-4 h-4 mr-1" />
                          {reminder.channel}
                        </span>
                      </div>
                      <span className="text-gray-400">
                        By {reminder.nurseName}
                      </span>
                    </div>

                    {(reminder.lastError || reminder.internalNote) && (
                      <p className="text-xs text-gray-400 bg-yellow-50 p-2 rounded">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        Note: {reminder.lastError || reminder.internalNote}
                      </p>
                    )}
                  </div>
                ))}
                {pendingScheduledReminders.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No pending scheduled reminders</p>
                    <p className="text-sm text-gray-400">
                      Create a reminder to get started
                    </p>
                  </div>
                )}
                    </>
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
