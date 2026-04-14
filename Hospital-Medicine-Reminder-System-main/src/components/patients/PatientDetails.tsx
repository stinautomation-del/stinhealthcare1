import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUIStore } from '@/store/useStore';
import { prescriptionsApi, scheduleApi } from '@/services/api';
import {
  User,
  Phone,
  MapPin,
  Stethoscope,
  AlertCircle,
  Pill,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatTimeToAmPm } from '@/lib/utils';
import type { Prescription, ScheduleEntry } from '@/types';

export function PatientDetails() {
  const { selectedPatient, patientModalOpen, patientModalInitialTab, closePatientModal } = useUIStore();
  
  const [activeTab, setActiveTab] = useState('info');
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([]);
  const [patientSchedule, setPatientSchedule] = useState<ScheduleEntry[]>([]);
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  useEffect(() => {
    if (patientModalOpen) {
      setActiveTab(patientModalInitialTab);
    }
  }, [patientModalOpen, patientModalInitialTab]);

  useEffect(() => {
    let isMounted = true;

    const loadPatientPrescriptions = async () => {
      if (!selectedPatient?.id || !patientModalOpen) return;

      setIsLoadingPrescriptions(true);
      try {
        const response = await prescriptionsApi.getByPatient(selectedPatient.id);
        if (isMounted && response.success) {
          setPatientPrescriptions(response.data || []);
        }
        if (isMounted && !response.success) {
          setPatientPrescriptions([]);
        }
      } catch (error) {
        if (isMounted) {
          setPatientPrescriptions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPrescriptions(false);
        }
      }
    };

    loadPatientPrescriptions();

    return () => {
      isMounted = false;
    };
  }, [selectedPatient?.id, patientModalOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadPatientSchedule = async () => {
      if (!selectedPatient?.id || !patientModalOpen) return;

      setIsLoadingSchedule(true);
      try {
        const response = await scheduleApi.getByPatient(selectedPatient.id);
        if (isMounted && response.success) {
          setPatientSchedule(response.data || []);
        }
        if (isMounted && !response.success) {
          setPatientSchedule([]);
        }
      } catch {
        if (isMounted) {
          setPatientSchedule([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSchedule(false);
        }
      }
    };

    loadPatientSchedule();

    return () => {
      isMounted = false;
    };
  }, [selectedPatient?.id, patientModalOpen]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'given':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'missed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getLanguageLabel = (lang: string) => {
    const labels: Record<string, string> = {
      en: 'English',
      ta: 'Tamil',
      hi: 'Hindi',
    };
    return labels[lang] || lang;
  };

  if (!selectedPatient) return null;

  return (
    <Dialog open={patientModalOpen} onOpenChange={closePatientModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span>{selectedPatient.fullName}</span>
              <p className="text-sm font-normal text-gray-500">
                Patient ID: {selectedPatient.id}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Patient Info</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          {/* Patient Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  Contact Information
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span>{selectedPatient.phone}</span>
                  </div>
                  {selectedPatient.whatsappNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">WhatsApp:</span>
                      <span>{selectedPatient.whatsappNumber}</span>
                    </div>
                  )}
                  {selectedPatient.emergencyContact && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Emergency Contact:</span>
                        <span>{selectedPatient.emergencyContact}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Emergency Phone:</span>
                        <span>{selectedPatient.emergencyPhone}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ward:</span>
                    <span>{selectedPatient.ward}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Room:</span>
                    <span>{selectedPatient.room}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bed:</span>
                    <span>{selectedPatient.bed}</span>
                  </div>
                </div>
              </div>

              {/* Doctor */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center">
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Medical Team
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Doctor:</span>
                    <span>{selectedPatient.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Admitted:</span>
                    <span>
                      {format(new Date(selectedPatient.admittedAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Preferences & Alerts
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Language:</span>
                    <Badge variant="outline">
                      {getLanguageLabel(selectedPatient.preferredLanguage)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Notifications:</span>
                    <Badge>{selectedPatient.notificationPreference}</Badge>
                  </div>
                  {selectedPatient.allergies.length > 0 && (
                    <div className="mt-2">
                      <span className="text-gray-500">Allergies:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedPatient.allergies.map((allergy) => (
                          <Badge key={allergy} variant="destructive">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Patient Status</span>
              </div>
              <Badge
                variant={selectedPatient.isActive ? 'default' : 'secondary'}
                className="text-sm"
              >
                {selectedPatient.isActive ? 'Active' : 'Discharged'}
              </Badge>
            </div>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions">
            <div className="space-y-3">
              {isLoadingPrescriptions ? (
                <div className="text-center py-8">
                  <Pill className="w-12 h-12 text-gray-300 mx-auto mb-2 animate-pulse" />
                  <p className="text-gray-500">Loading prescriptions...</p>
                </div>
              ) : patientPrescriptions.length === 0 ? (
                <div className="text-center py-8">
                  <Pill className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No prescriptions found</p>
                </div>
              ) : (
                patientPrescriptions.map((prescription) => (
                  <div
                    key={prescription.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Pill className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold">
                          {prescription.medicineName}
                        </span>
                      </div>
                      <Badge
                        variant={prescription.isActive ? 'default' : 'secondary'}
                      >
                        {prescription.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Dose:</span>{' '}
                        {prescription.dose}
                      </div>
                      <div>
                        <span className="text-gray-500">Quantity:</span>{' '}
                        {prescription.quantity}
                      </div>
                      <div>
                        <span className="text-gray-500">Frequency:</span>{' '}
                        {prescription.frequency}
                      </div>
                      <div>
                        <span className="text-gray-500">Times:</span>{' '}
                        {prescription.times.map(formatTimeToAmPm).join(', ')}
                      </div>
                    </div>
                    {prescription.specialInstructions && (
                      <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                        <strong>Note:</strong> {prescription.specialInstructions}
                      </p>
                    )}
                    <div className="text-xs text-gray-400">
                      Prescribed by {prescription.prescribedByName} on{' '}
                      {format(new Date(prescription.prescribedAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <div className="space-y-3">
              {isLoadingSchedule ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2 animate-pulse" />
                  <p className="text-gray-500">Loading schedule...</p>
                </div>
              ) : patientSchedule.length === 0 && patientPrescriptions.length > 0 ? (
                patientPrescriptions.flatMap((prescription) =>
                  prescription.times.map((time) => (
                    <div
                      key={`${prescription.id}-${time}`}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="font-medium">{prescription.medicineName}</p>
                          <p className="text-sm text-gray-500">
                            {prescription.dose} - {formatTimeToAmPm(time)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-blue-100 text-blue-800">Planned</Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {prescription.startDate} to {prescription.endDate}
                        </p>
                      </div>
                    </div>
                  ))
                )
              ) : patientSchedule.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No schedule entries found</p>
                </div>
              ) : (
                patientSchedule.map((entry) => (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(entry.status)}
                      <div>
                        <p className="font-medium">{entry.medicineName}</p>
                        <p className="text-sm text-gray-500">
                          {entry.dose} - {formatTimeToAmPm(entry.scheduledTime)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={
                          entry.status === 'given'
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'missed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {entry.status}
                      </Badge>
                      {entry.acknowledgedByName && (
                        <p className="text-xs text-gray-400 mt-1">
                          by {entry.acknowledgedByName}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
