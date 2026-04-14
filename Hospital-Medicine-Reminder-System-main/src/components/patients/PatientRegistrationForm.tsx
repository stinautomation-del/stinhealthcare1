import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { patientsApi } from '@/services/api';
import { useDataStore } from '@/store/useStore';
import { Loader2, Plus, X } from 'lucide-react';
import { patientSchema, type PatientSchemaInput } from '@/lib/validation';
import type { Patient } from '@/types';
import { toast } from 'sonner';

interface PatientRegistrationFormProps {
  onSuccess: () => void;
}

const fallbackDoctors = [
  { id: '0d9fc24d-2d2f-4d0e-bdb1-6022ec09ac01', name: 'Dr. Rajesh Sharma' },
  { id: '446a7a02-cd9a-4ecc-8fbf-aa2a7d5ed0b0', name: 'Dr. Priya Patel' },
];

export function PatientRegistrationForm({ onSuccess }: PatientRegistrationFormProps) {
  const { addPatient } = useDataStore();
  const [doctorOptions, setDoctorOptions] = useState(fallbackDoctors);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PatientSchemaInput>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      ward: 'Ward 3B',
      preferredLanguage: 'en',
      notificationPreference: 'whatsapp',
      allergies: [],
    },
  });

  useEffect(() => {
    const loadDoctors = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'doctor')
        .eq('isActive', true)
        .order('name', { ascending: true });

      if (data && data.length > 0) {
        setDoctorOptions(data);
        setValue('doctorId', data[0].id);
        setValue('doctorName', data[0].name);
      }
    };
    loadDoctors();
  }, [setValue]);

  const handleAddAllergy = () => {
    if (newAllergy && !allergies.includes(newAllergy)) {
      const updated = [...allergies, newAllergy];
      setAllergies(updated);
      setValue('allergies', updated);
      setNewAllergy('');
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    const updated = allergies.filter((a) => a !== allergy);
    setAllergies(updated);
    setValue('allergies', updated);
  };

  const onSubmit = async (data: PatientSchemaInput) => {
    try {
      const res = await patientsApi.create({
        ...data,
        isActive: true,
      } as Omit<Patient, 'id' | 'admittedAt'>);

      if (res.success && res.data) {
        addPatient(res.data);
        toast.success('Patient Registered', { description: `${data.fullName} has been added to the registry.` });
        onSuccess();
      } else {
        toast.error('Registration Failed', { description: res.error });
      }
    } catch (error) {
      toast.error('Error', { description: 'An unexpected error occurred.' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" {...register('fullName')} placeholder="John Doe" />
            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input id="phone" {...register('phone')} placeholder="+91 9876543210" />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
            <Input id="whatsappNumber" {...register('whatsappNumber')} placeholder="+91 9876543210" />
            {errors.whatsappNumber && <p className="text-xs text-red-500">{errors.whatsappNumber.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredLanguage">Preferred Language</Label>
            <select
              id="preferredLanguage"
              {...register('preferredLanguage')}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="en">English</option>
              <option value="ta">Tamil</option>
              <option value="hi">Hindi</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Hospital Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ward">Ward</Label>
            <select id="ward" {...register('ward')} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="Ward 2A">Ward 2A</option>
              <option value="Ward 3B">Ward 3B</option>
              <option value="Ward 4A">Ward 4A</option>
              <option value="ICU">ICU</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room">Room Number</Label>
            <Input id="room" {...register('room')} placeholder="301" />
            {errors.room && <p className="text-xs text-red-500">{errors.room.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bed">Bed Number</Label>
            <Input id="bed" {...register('bed')} placeholder="12" />
            {errors.bed && <p className="text-xs text-red-500">{errors.bed.message}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Medical Assignment</h3>
        <div className="space-y-2">
          <Label htmlFor="doctor">Assigned Doctor</Label>
          <select
            id="doctor"
            {...register('doctorId')}
            onChange={(e) => {
              const doc = doctorOptions.find(d => d.id === e.target.value);
              setValue('doctorId', e.target.value);
              if (doc) setValue('doctorName', doc.name);
            }}
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {doctorOptions.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="text-lg font-semibold text-gray-900">Allergies</h3>
           <Badge variant="outline" className="font-normal text-gray-500">
             {allergies.length} Added
           </Badge>
        </div>
        <div className="flex space-x-2">
          <Input
            value={newAllergy}
            onChange={(e) => setNewAllergy(e.target.value)}
            placeholder="Add allergy (e.g., Penicillin)"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllergy())}
          />
          <Button type="button" onClick={handleAddAllergy} variant="secondary">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {allergies.map((a) => (
            <Badge key={a} variant="destructive" className="bg-red-50 text-red-700 border-red-200 gap-1 pr-1.5 py-1">
              {a}
              <X className="w-3 h-3 cursor-pointer hover:text-red-900" onClick={() => handleRemoveAllergy(a)} />
            </Badge>
          ))}
          {allergies.length === 0 && <p className="text-xs text-gray-400 italic">No allergies recorded</p>}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="ghost" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
          {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registering...</> : 'Register Patient'}
        </Button>
      </div>
    </form>
  );
}
