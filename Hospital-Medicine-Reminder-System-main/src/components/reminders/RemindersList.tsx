import { useCallback, useEffect, useState } from 'react';
import { CardSkeleton } from '@/components/ui/skeleton-loader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { scheduleApi } from '@/services/api';
import { useDataStore, useAuthStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Pill,
  MapPin,
  Bed,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatTimeToAmPm } from '@/lib/utils';
import type { ScheduleEntry } from '@/types';

export function RemindersList() {
  const { user } = useAuthStore();
  const { scheduleEntries, setScheduleEntries } = useDataStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [notifyPatient, setNotifyPatient] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadReminders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await scheduleApi.getToday(page, pageSize);
      if (response.success) {
        setScheduleEntries(response.data!);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, setScheduleEntries]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    const channel = supabase
      .channel(`reminders-live-${today}-${page}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_entries',
          filter: `scheduledDate=eq.${today}`,
        },
        () => {
          loadReminders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReminders, page]);

  const handleAcknowledge = async (entry: ScheduleEntry) => {
    if (!user) return;
    
    setAcknowledgingId(entry.id);
    try {
      const response = await scheduleApi.acknowledge(
        entry.id,
        user.id,
        user.name,
        notifyPatient
      );
      
      if (response.success) {
        setScheduleEntries(
          scheduleEntries.map((e) =>
            e.id === entry.id ? response.data! : e
          )
        );
      }
    } catch (error) {
      console.error('Error acknowledging dose:', error);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const pendingReminders = scheduleEntries.filter((e) => e.status === 'pending');
  const givenReminders = scheduleEntries.filter((e) => e.status === 'given');
  const missedReminders = scheduleEntries.filter((e) => e.status === 'missed');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'given':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Given
          </Badge>
        );
      case 'missed':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Missed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  const ReminderCard = ({ entry }: { entry: ScheduleEntry }) => (
    <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold">{entry.patientName}</p>
            <div className="flex items-center text-sm text-gray-500 space-x-2">
              <MapPin className="w-3 h-3" />
              <span>{entry.ward}</span>
              <Bed className="w-3 h-3 ml-2" />
              <span>Room {entry.room}, Bed {entry.bed}</span>
            </div>
          </div>
        </div>
        {getStatusBadge(entry.status)}
      </div>

      <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
        <Pill className="w-5 h-5 text-blue-500" />
        <div>
          <p className="font-medium">
            {entry.medicineName} {entry.dose}
          </p>
          <p className="text-sm text-gray-500">
            Quantity: {entry.quantity} tablet(s) at {formatTimeToAmPm(entry.scheduledTime)}
          </p>
        </div>
      </div>

      {entry.status === 'pending' && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`notify-${entry.id}`}
              checked={notifyPatient}
              onCheckedChange={(checked) => setNotifyPatient(checked as boolean)}
            />
            <label
              htmlFor={`notify-${entry.id}`}
              className="text-sm text-gray-600 flex items-center"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Notify patient on WhatsApp/SMS
            </label>
          </div>
          <Button
            className="w-full"
            onClick={() => handleAcknowledge(entry)}
            disabled={acknowledgingId === entry.id}
          >
            {acknowledgingId === entry.id ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Given
              </>
            )}
          </Button>
        </div>
      )}

      {entry.status === 'given' && entry.acknowledgedByName && (
        <div className="text-sm text-gray-500 bg-green-50 p-2 rounded">
          <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
          Given by {entry.acknowledgedByName} at{' '}
          {entry.acknowledgedAt
            ? format(new Date(entry.acknowledgedAt), 'h:mm a')
            : 'N/A'}
          {entry.notificationSent && (
            <span className="ml-2 text-green-600">
              • Patient notified
            </span>
          )}
        </div>
      )}

      {entry.status === 'missed' && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          Escalated to Head Nurse
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Today's Reminders</h2>
          <p className="text-gray-500 mt-1">Monitor and acknowledge patient medication doses</p>
        </div>
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Medication Reminders</h2>
          <p className="text-gray-500 mt-1">
            View and manage today's medication reminders
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-3 py-1">
            <Clock className="w-3 h-3 mr-1" />
            Live updates: On
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {pendingReminders.length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Given</p>
                <p className="text-2xl font-bold text-green-700">
                  {givenReminders.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Missed</p>
                <p className="text-2xl font-bold text-red-700">
                  {missedReminders.length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reminders Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({pendingReminders.length})
          </TabsTrigger>
          <TabsTrigger value="given">
            Given ({givenReminders.length})
          </TabsTrigger>
          <TabsTrigger value="missed">
            Missed ({missedReminders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingReminders.map((entry) => (
              <ReminderCard key={entry.id} entry={entry} />
            ))}
            {pendingReminders.length === 0 && (
              <div className="col-span-full text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-xl font-medium text-gray-900">
                  All caught up!
                </p>
                <p className="text-gray-500">
                  No pending reminders at the moment
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="given" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {givenReminders.map((entry) => (
              <ReminderCard key={entry.id} entry={entry} />
            ))}
            {givenReminders.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No doses given yet today</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="missed" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {missedReminders.map((entry) => (
              <ReminderCard key={entry.id} entry={entry} />
            ))}
            {missedReminders.length === 0 && (
              <div className="col-span-full text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-xl font-medium text-gray-900">
                  Excellent!
                </p>
                <p className="text-gray-500">
                  No missed doses today
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-6 border-t pt-4">
          <p className="text-sm text-gray-500">
            Showing page {page}
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={scheduleEntries.length < pageSize}
            >
              Next
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
