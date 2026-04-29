import { z } from 'zod'

// ─── Common ────────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid()

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
})

// ─── Auth ──────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})

// ─── Tenant ────────────────────────────────────────────────────────────────

export const createTenantSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  planType: z.enum(['BASIC', 'PRO']).default('BASIC').optional(),
  planId: z.string().uuid().optional().nullable(),
  logoUrl: z.string().optional().nullable(),  // URL absoluta ou caminho relativo (/uploads/...)
})

/** Schema para criação de tenant via Super Admin (inclui dados do Gestor inicial) */
export const createTenantWithGestorSchema = createTenantSchema.extend({
  gestor: z.object({
    name: z.string().min(2).max(255),
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().optional(),
  }),
})

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  planType: z.enum(['BASIC', 'PRO']).optional(),
  planId: z.string().uuid().optional().nullable(),
  logoUrl: z.string().optional().nullable(),  // URL absoluta ou caminho relativo (/uploads/...)
})

// ─── Professional ──────────────────────────────────────────────────────────

export const createProfessionalSchema = z.object({
  name: z.string().min(2).max(255),
  specialty: z.string().max(255).optional(),
  bio: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  userId: z.string().uuid().optional(),
  avatarUrl: z.string().optional().nullable(),  // URL relativa (/uploads/avatars/...)
})

export const updateProfessionalSchema = createProfessionalSchema.partial()

// ─── Procedure ─────────────────────────────────────────────────────────────

export const createProcedureSchema = z.object({
  name:            z.string().min(2).max(255),
  description:     z.string().optional(),
  durationMinutes: z.number().int().min(5).max(480),
  priceCents:      z.number().int().min(0).optional(),  // centavos; ex: 15000 = R$150
  color:           z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

export const updateProcedureSchema = z.object({
  name:            z.string().min(2).max(255).optional(),
  description:     z.string().optional().nullable(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  priceCents:      z.number().int().min(0).optional().nullable(),
  color:           z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
})

// ─── Work Schedule ─────────────────────────────────────────────────────────

export const workScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
  slotIntervalMinutes: z.number().int().min(5).max(120).default(30),
})

// ─── Patient ───────────────────────────────────────────────────────────────

const genderEnum = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
const notificationChannelEnum = z.enum(['WHATSAPP', 'SMS', 'EMAIL'])

export const createPatientSchema = z.object({
  name: z.string().min(2).max(255),
  phone: z
    .string()
    .min(10)
    .max(20)
    .regex(/^\+?[\d\s()-]+$/, 'Telefone inválido'),
  email: z.string().email().optional(),
  birthDate: z.string().date().optional(),          // "YYYY-MM-DD"
  gender: genderEnum.optional(),
  city: z.string().max(255).optional(),
  preferredContactChannel: notificationChannelEnum.optional(),
  marketingOptIn: z.boolean().optional(),
  notes: z.string().optional(),
})

export const updatePatientSchema = createPatientSchema.partial().extend({
  email: z.string().email().optional().nullable(),
  birthDate: z.string().date().optional().nullable(),
  gender: genderEnum.optional().nullable(),
  city: z.string().max(255).optional().nullable(),
  preferredContactChannel: notificationChannelEnum.optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ─── Appointment ───────────────────────────────────────────────────────────

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  professionalId: z.string().uuid(),
  procedureId: z.string().uuid(),
  scheduledDate: z.string().date(),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
  notes: z.string().optional(),
  // Sobrescreve a duração padrão do procedimento para este agendamento específico.
  // Se omitido, usa procedure.durationMinutes.
  durationMinutes: z.number().int().min(5).max(480).optional(),
})

export const cancelAppointmentSchema = z.object({
  reason: z.string().optional(),
})

// ─── Public Booking (Página Pública) ───────────────────────────────────────

export const publicBookingSchema = z.object({
  patientName: z.string().min(2).max(255),
  patientPhone: z
    .string()
    .min(10)
    .max(20)
    .regex(/^\+?[\d\s()-]+$/),
  patientEmail: z.string().email().optional(),
  professionalId: z.string().uuid(),
  procedureId: z.string().uuid(),
  scheduledDate: z.string().date(),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
})

// ─── Waitlist ──────────────────────────────────────────────────────────────

export const createWaitlistEntrySchema = z.object({
  patientPhone: z.string().min(10).max(20),
  patientName: z.string().min(2).max(255),
  professionalId: z.string().uuid().optional(),
  procedureId: z.string().uuid(),
  preferredDateFrom: z.string().date().optional(),
  preferredDateTo: z.string().date().optional(),
  minAdvanceMinutes: z.number().int().min(30).max(1440).default(60),
})

// ─── User Management ───────────────────────────────────────────────────────

export const createUserSchema = z.object({
  name:           z.string().min(2).max(255),
  email:          z.string().email(),
  password:       z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  phone:          z.string().max(20).optional(),
  role:           z.enum(['GESTOR', 'RECEPCAO', 'PROFISSIONAL']),
  professionalId: z.string().uuid().optional(),
})

export const updateUserSchema = z.object({
  name:  z.string().min(2).max(255).optional(),
  phone: z.string().max(20).optional().nullable(),
})

export type CreateUserInput  = z.infer<typeof createUserSchema>
export type UpdateUserInput  = z.infer<typeof updateUserSchema>

// ─── Appointment Evaluation ────────────────────────────────────────────────

export const createAppointmentEvaluationSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

// ─── Patient Evaluation ────────────────────────────────────────────────────

export const createPatientEvaluationSchema = z.object({
  notes: z.string().min(1).max(2000),
  tags: z.array(z.string()).default([]),
})

// ─── Types inferred from schemas ───────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>
export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type CreateTenantWithGestorInput = z.infer<typeof createTenantWithGestorSchema>
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>
export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>
export type CreateProcedureInput = z.infer<typeof createProcedureSchema>
export type CreatePatientInput = z.infer<typeof createPatientSchema>
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type PublicBookingInput = z.infer<typeof publicBookingSchema>
export type CreateWaitlistEntryInput = z.infer<typeof createWaitlistEntrySchema>
