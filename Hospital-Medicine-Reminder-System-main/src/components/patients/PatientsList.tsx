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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { patientsApi } from '@/services/api';
import { useDataStore, useUIStore, useAuthStore } from '@/store/useStore';
import {
  Search,
  Plus,
  Phone,
  MapPin,
  User,
  ChevronRight,
  Filter,
  Bed,
} from 'lucide-react';
import { PatientRegistrationForm } from './PatientRegistrationForm';
import { PatientDetails } from './PatientDetails';
import type { Patient } from '@/types';

export function PatientsList() {
  const { patients, setPatients } = useDataStore();
  const { setSelectedPatient, openPatientModal } = useUIStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { user } = useAuthStore();
  const canRegister = user && ['admin', 'doctor', 'head_nurse', 'nurse'].includes(user.role);

  useEffect(() => {
    const loadPatients = async () => {
      setIsLoading(true);
      try {
        const response = await patientsApi.getAll(page, pageSize);
        if (response.success) {
          setPatients(response.data!);
        }
      } catch (error) {
        console.error('Error loading patients:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPatients();
  }, [setPatients, page]);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.includes(searchQuery) ||
      patient.bed.includes(searchQuery);
    
    const matchesWard = selectedWard === 'all' || patient.ward === selectedWard;
    
    return matchesSearch && matchesWard;
  });

  const wards = Array.from(new Set(patients.map((p) => p.ward)));

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    openPatientModal();
  };

  const getLanguageLabel = (lang: string) => {
    const labels: Record<string, string> = {
      en: 'English',
      ta: 'Tamil',
      hi: 'Hindi',
    };
    return labels[lang] || lang;
  };

  const getNotificationPreferenceBadge = (pref: string) => {
    const styles: Record<string, string> = {
      whatsapp: 'bg-green-100 text-green-800',
      sms: 'bg-blue-100 text-blue-800',
      both: 'bg-purple-100 text-purple-800',
      none: 'bg-gray-100 text-gray-800',
    };
    return styles[pref] || styles.none;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patient Directory</h2>
          <p className="text-gray-500 mt-1">Manage patient records and view their details</p>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patients</h2>
          <p className="text-gray-500 mt-1">
            Manage patient records and view their details
          </p>
        </div>
        {canRegister && (
          <Dialog open={isRegistrationOpen} onOpenChange={setIsRegistrationOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Register Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Register New Patient</DialogTitle>
              </DialogHeader>
              <PatientRegistrationForm onSuccess={() => setIsRegistrationOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, phone, or bed number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Wards</option>
                {wards.map((ward) => (
                  <option key={ward} value={ward}>
                    {ward}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Patients ({filteredPatients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Notifications</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{patient.fullName}</p>
                          <p className="text-sm text-gray-500">ID: {patient.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{patient.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <Bed className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {patient.ward}, Room {patient.room}, Bed {patient.bed}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{patient.doctorName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getLanguageLabel(patient.preferredLanguage)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getNotificationPreferenceBadge(patient.notificationPreference)}>
                        {patient.notificationPreference}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={patient.isActive ? 'default' : 'secondary'}
                      >
                        {patient.isActive ? 'Active' : 'Discharged'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(patient)}
                      >
                        View
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPatients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No patients found</p>
                      <p className="text-sm text-gray-400">
                        Try adjusting your search or filters
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 border-t pt-4">
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
                disabled={patients.length < pageSize}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Details Dialog */}
      <PatientDetails />
    </div>
  );
}
