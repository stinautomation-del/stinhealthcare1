import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { prescriptionsApi } from '@/services/api';
import { useDataStore, useAuthStore, useUIStore } from '@/store/useStore';
import { Loader2, Plus, X, Clock } from 'lucide-react';
import { prescriptionSchema, type PrescriptionSchemaInput } from '@/lib/validation';
import type { Prescription } from '@/types';
import { toast } from 'sonner';

interface PrescriptionFormProps {
  onSuccess: () => void;
}

export function PrescriptionForm({ onSuccess }: PrescriptionFormProps) {
  const { user } = useAuthStore();
  const { selectedPatient } = useUIStore();
  const { patients, addPrescription } = useDataStore();
  
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PrescriptionSchemaInput>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      frequency: 'OD',
      quantity: 1,
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (selectedPatient) {
      setValue('patientId', selectedPatient.id);
      setValue('patientName', selectedPatient.fullName);
    }
  }, [selectedPatient, setValue]);

  const handleAddTime = () => {
    if (newTime && !selectedTimes.includes(newTime)) {
      const updated = [...selectedTimes, newTime].sort();
      setSelectedTimes(updated);
      setValue('customSchedule', updated);
      setNewTime('');
    }
  };

  const handleRemoveTime = (time: string) => {
    const updated = selectedTimes.filter((t) => t !== time);
    setSelectedTimes(updated);
    setValue('customSchedule', updated);
  };

  const onSubmit = async (data: PrescriptionSchemaInput) => {
    if (!user) return;
    if (selectedTimes.length === 0) {
       toast.error('Missing Schedule', { description: 'Please add at least one time slot.' });
       return;
    }

    try {
      const res = await prescriptionsApi.create({
        patientId: data.patientId,
        patientName: data.patientName,
        medicineName: data.medicineName,
        dose: data.dosage,
        quantity: Number(data.quantity),
        frequency: data.frequency,
        times: selectedTimes,
        startDate: data.startDate,
        endDate: data.endDate,
        specialInstructions: data.instructions,
        prescribedBy: user.id,
        prescribedByName: user.name,
        isActive: true,
      } as Omit<Prescription, 'id' | 'prescribedAt'>);

      if (res.success && res.data) {
        addPrescription(res.data);
        toast.success('Prescription Created', { description: `New prescription for ${data.medicineName} has been recorded.` });
        onSuccess();
      } else {
        toast.error('Failure', { description: res.error });
      }
    } catch (error) {
      toast.error('Critical Error', { description: 'An unexpected error occurred during creation.' });
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        slots.push(`${hour}:00`);
        slots.push(`${hour}:30`);
    }
    return slots;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="patient">Patient Selection</Label>
        <select
          id="patient"
          {...register('patientId')}
          onChange={(e) => {
            const p = patients.find(pat => pat.id === e.target.value);
            setValue('patientId', e.target.value);
            if (p) setValue('patientName', p.fullName);
          }}
          className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Select a patient...</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.fullName} (Bed {p.bed})</option>
          ))}
        </select>
        {errors.patientId && <p className="text-xs text-red-500">{errors.patientId.message}</p>}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Treatment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="medicineName">Medicine Name</Label>
            <Input id="medicineName" {...register('medicineName')} placeholder="e.g., Amoxicillin" />
            {errors.medicineName && <p className="text-xs text-red-500">{errors.medicineName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dosage">Dosage (e.g. 500mg)</Label>
            <Input id="dosage" {...register('dosage')} placeholder="500mg" />
            {errors.dosage && <p className="text-xs text-red-500">{errors.dosage.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              {...register('quantity', { valueAsNumber: true })}
              placeholder="1"
            />
            {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <select id="frequency" {...register('frequency')} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="OD">OD - 1x Daily</option>
              <option value="BD">BD - 2x Daily</option>
              <option value="TDS">TDS - 3x Daily</option>
              <option value="QID">QID - 4x Daily</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Schedule & Times</h3>
        <div className="flex space-x-2">
          <select value={newTime} onChange={e => setNewTime(e.target.value)} className="flex-1 border rounded-md px-3 py-2 text-sm">
            <option value="">Select Time Slot...</option>
            {generateTimeSlots().map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button type="button" onClick={handleAddTime} variant="secondary"><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 rounded-md border border-dashed">
          {selectedTimes.map(t => (
            <Badge key={t} className="bg-blue-50 text-blue-700 border-blue-200 gap-1 pr-1.5 py-1">
              <Clock className="w-3 h-3" /> {t}
              <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveTime(t)} />
            </Badge>
          ))}
          {selectedTimes.length === 0 && <p className="text-xs text-gray-400 italic m-auto">Add scheduled delivery times</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input id="startDate" type="date" {...register('startDate')} />
          {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input id="endDate" type="date" {...register('endDate')} />
          {errors.endDate && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Special Instructions</Label>
        <Textarea id="instructions" {...register('instructions')} placeholder="Take with food, avoid caffeine, etc." />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="ghost" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
          {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Confirm Prescription'}
        </Button>
      </div>
    </form>
  );
}
