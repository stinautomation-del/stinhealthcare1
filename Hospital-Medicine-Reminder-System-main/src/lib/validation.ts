import { z } from 'zod';

// Reusable regex
const phoneRegex = /^\+?[\d\s-]{10,}$/;

export const patientSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
  whatsappNumber: z.string().regex(phoneRegex, 'Invalid WhatsApp number format').optional().or(z.literal('')),
  ward: z.string().min(1, 'Ward is required'),
  room: z.string().min(1, 'Room number is required'),
  bed: z.string().min(1, 'Bed number is required'),
  doctorId: z.string().uuid('Invalid doctor selection'),
  doctorName: z.string().min(1, 'Doctor name is required'),
  emergencyContact: z.string().min(2, 'Emergency contact name is required').optional().or(z.literal('')),
  emergencyPhone: z.string().regex(phoneRegex, 'Invalid phone number format').optional().or(z.literal('')),
  preferredLanguage: z.enum(['en', 'ta', 'hi']),
  notificationPreference: z.enum(['whatsapp', 'sms', 'both', 'none']),
  allergies: z.array(z.string()).default([]),
});

export const prescriptionSchema = z.object({
  patientId: z.string().uuid('Please select a patient'),
  patientName: z.string().min(1),
  medicineName: z.string().min(2, 'Medicine name is required'),
  dosage: z.string().min(1, 'Dosage is required (e.g., 500mg)'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  frequency: z.enum(['OD', 'BD', 'TDS', 'QID', 'Custom']),
  instructions: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  customSchedule: z.array(z.string()).optional(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "End date cannot be before start date",
  path: ["endDate"],
});

export type PatientSchema = z.output<typeof patientSchema>;
export type PatientSchemaInput = z.input<typeof patientSchema>;
export type PrescriptionSchema = z.output<typeof prescriptionSchema>;
export type PrescriptionSchemaInput = z.input<typeof prescriptionSchema>;
