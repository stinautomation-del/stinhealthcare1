import { useEffect, useState } from 'react';
import { TableSkeleton } from '@/components/ui/skeleton-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { prescriptionsApi, patientsApi } from '@/services/api';
import { useDataStore, useAuthStore, useUIStore } from '@/store/useStore';
import {
  Search,
  Plus,
  Pill,
  User,
  Clock,
  Calendar,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { formatTimeToAmPm } from '@/lib/utils';
import { PrescriptionForm } from './PrescriptionForm';
import { PatientDetails } from '@/components/patients/PatientDetails';

export function PrescriptionsList() {
  const { prescriptions, patients, setPrescriptions, setPatients } = useDataStore();
  const { setSelectedPatient: setUIPatient, openPatientModal } = useUIStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { user } = useAuthStore();
  const canPrescribe = user && ['admin', 'doctor', 'head_nurse', 'nurse'].includes(user.role);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [prescriptionsRes, patientsRes] = await Promise.all([
          prescriptionsApi.getAll(page, pageSize),
          patientsApi.getAll(1, 100), // Patients for dropdown
        ]);

        if (prescriptionsRes.success) setPrescriptions(prescriptionsRes.data!);
        if (patientsRes.success) setPatients(patientsRes.data!);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [setPrescriptions, setPatients]);

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const matchesSearch =
      prescription.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prescription.patientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPatient = selectedPatient === 'all' || prescription.patientId === selectedPatient;
    
    return matchesSearch && matchesPatient;
  });

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      OD: 'Once daily',
      BD: 'Twice daily',
      TDS: 'Three times daily',
      QID: 'Four times daily',
      Custom: 'Custom',
    };
    return labels[freq] || freq;
  };

  const handleViewPatientPrescriptions = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return;

    setUIPatient(patient);
    openPatientModal('prescriptions');
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 bg-gradient-to-b from-slate-50 to-white min-h-full">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Medication management</p>
          <h2 className="text-3xl font-bold text-slate-900">Prescriptions</h2>
          <p className="text-slate-500 max-w-2xl">Review active medication orders, filter by patient, and create new prescriptions from a focused workspace.</p>
        </div>
        <div className="rounded-2xl border bg-white shadow-sm p-4">
          <TableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-b from-slate-50 to-white min-h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Medication management</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Prescriptions</h2>
          <p className="max-w-2xl text-sm text-slate-500">
            Monitor medication plans, validate dosage timing, and keep prescription records organized in one place.
          </p>
        </div>
        {canPrescribe && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                New Prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-xl">Create New Prescription</DialogTitle>
                <DialogDescription>
                  Enter patient, dosage, timing, and prescription details.
                </DialogDescription>
              </DialogHeader>
              <PrescriptionForm onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by medicine or patient name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 sm:min-w-[240px]">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="all">All Patients</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-slate-50/70">
          <CardTitle className="text-lg text-slate-900">
            All Prescriptions ({filteredPrescriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prescribed By</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrescriptions.map((prescription) => (
                  <TableRow key={prescription.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium">{prescription.patientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Pill className="w-4 h-4 text-gray-400" />
                        <span>{prescription.medicineName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{prescription.dose}</p>
                        <p className="text-gray-500">Qty: {prescription.quantity}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm">{getFrequencyLabel(prescription.frequency)}</p>
                          <p className="text-xs text-gray-500">
                            {prescription.times.map(formatTimeToAmPm).join(', ')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div className="text-sm">
                          <p>{prescription.startDate}</p>
                          <p className="text-gray-500">to {prescription.endDate}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={prescription.isActive ? 'default' : 'secondary'}
                      >
                        {prescription.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{prescription.prescribedByName}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPatientPrescriptions(prescription.patientId)}
                      >
                        View
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPrescriptions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8">
                        <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-700 font-medium">No prescriptions found</p>
                        <p className="text-sm text-slate-500 mt-1">
                        Try adjusting your search or filters
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 border-t pt-4">
            <p className="text-sm text-slate-500">
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
                disabled={prescriptions.length < pageSize}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PatientDetails />
    </div>
  );
}
