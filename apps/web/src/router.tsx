// ─── Router ───────────────────────────────────────────────────────────────────
//
//  /super-admin/login              → Super Admin login (pública)
//  /super-admin                    → SuperAdminLayout (guard)
//    tenants, tenants/new
//
//  /app/:slug/login                → Clinic login (pública)
//  /app/:slug                      → ClinicLayout (guard)
//    dashboard, professionals, professionals/new
//    patients, patients/new
//
//  /:slug                          → Booking público
//  /:slug/minha-conta/login        → Patient login (pública)
//  /:slug/minha-conta/esqueci-senha → Forgot password (pública)
//  /:slug/minha-conta/redefinir-senha → Reset password (pública)
//  /:slug/minha-conta              → PatientPortalLayout (guard)
//    /                             → Dashboard
//    /$section                     → agendamentos | perfil | seguranca
// ─────────────────────────────────────────────────────────────────────────────

import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  useParams,
} from '@tanstack/react-router'

// ── Super Admin ──────────────────────────────────────────────────────────────
import { SuperAdminLayout } from '@/features/super-admin/SuperAdminLayout'
import { requireSuperAdminAuth } from '@/features/super-admin/guards/SuperAdminGuard'
import { LoginPage as SuperAdminLoginPage } from '@/features/super-admin/pages/LoginPage'
import { TenantsPage } from '@/features/super-admin/pages/TenantsPage'
import { NewTenantPage } from '@/features/super-admin/pages/NewTenantPage'
import { PlansPage } from '@/features/super-admin/pages/PlansPage'
import { PlanDetailPage } from '@/features/super-admin/pages/PlanDetailPage'

// ── Public Booking ───────────────────────────────────────────────────────────
import { BookingPage } from '@/features/public-booking/BookingPage'
import { WorkSchedulePage } from '@/features/clinic/pages/WorkSchedulePage'

// ── Patient Portal (auth — públicas) ─────────────────────────────────────────
import { PatientLoginPage } from '@/features/patient-portal/pages/PatientLoginPage'
import { PatientOtpLoginPage } from '@/features/patient-portal/pages/PatientOtpLoginPage'
import { PatientForgotPasswordPage } from '@/features/patient-portal/pages/PatientForgotPasswordPage'
import { PatientResetPasswordPage } from '@/features/patient-portal/pages/PatientResetPasswordPage'

// ── Patient Portal (área protegida) ──────────────────────────────────────────
import { PatientPortalLayout } from '@/features/patient-portal/PatientPortalLayout'
import { requirePatientPortalAuth } from '@/features/patient-portal/guards/PatientGuard'
import { PatientDashboardPage } from '@/features/patient-portal/pages/PatientDashboardPage'
import { PatientAppointmentsPage } from '@/features/patient-portal/pages/PatientAppointmentsPage'
import { PatientProfilePage } from '@/features/patient-portal/pages/PatientProfilePage'
import { PatientSecurityPage } from '@/features/patient-portal/pages/PatientSecurityPage'

// ── Clinic ───────────────────────────────────────────────────────────────────
import { ClinicLayout } from '@/features/clinic/ClinicLayout'
import { requireClinicAuth } from '@/features/clinic/guards/ClinicGuard'
import { ClinicLoginPage } from '@/features/clinic/pages/LoginPage'
import { ForgotPasswordPage } from '@/features/clinic/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/clinic/pages/ResetPasswordPage'
import { DashboardPage } from '@/features/clinic/pages/DashboardPage'
import { ProfessionalsPage } from '@/features/clinic/pages/ProfessionalsPage'
import { NewProfessionalPage } from '@/features/clinic/pages/NewProfessionalPage'
import { PatientsPage } from '@/features/clinic/pages/PatientsPage'
import { NewPatientPage } from '@/features/clinic/pages/NewPatientPage'
import { AppointmentsPage } from '@/features/clinic/pages/AppointmentsPage'
import { NewAppointmentPage } from '@/features/clinic/pages/NewAppointmentPage'
import { EditAppointmentPage } from '@/features/clinic/pages/EditAppointmentPage'
import { EditProfessionalPage } from '@/features/clinic/pages/EditProfessionalPage'
import { PatientProfilePage as ClinicPatientProfilePage } from '@/features/clinic/pages/PatientProfilePage'
import { EditPatientPage } from '@/features/clinic/pages/EditPatientPage'
import { ProfilePage } from '@/features/clinic/pages/ProfilePage'
import { ChangePasswordPage } from '@/features/clinic/pages/ChangePasswordPage'
import { ProceduresPage } from '@/features/clinic/pages/ProceduresPage'
import { NewProcedurePage } from '@/features/clinic/pages/NewProcedurePage'
import { EditProcedurePage } from '@/features/clinic/pages/EditProcedurePage'
import { PatientPortalConfigPage } from '@/features/clinic/pages/PatientPortalConfigPage'
import { ClinicSettingsPage } from '@/features/clinic/pages/ClinicSettingsPage'
import { WaitlistPage } from '@/features/clinic/pages/WaitlistPage'
import { NotificationsPage } from '@/features/clinic/pages/NotificationsPage'
import { UsersPage } from '@/features/clinic/pages/UsersPage'
import { WhatsappPage } from '@/features/clinic/pages/WhatsappPage'
import { FeatureGate } from '@/components/FeatureGate'

// ─── Patient portal section dispatcher ──────────────────────────────────────

function PatientPortalSection() {
  const { section } = useParams({ strict: false }) as { section?: string }
  switch (section) {
    case 'agendamentos': return <PatientAppointmentsPage />
    case 'perfil':       return <PatientProfilePage />
    case 'seguranca':    return <PatientSecurityPage />
    default:             return <PatientDashboardPage />
  }
}

// ─── Dispatcher de seção ─────────────────────────────────────────────────────
// Rota /$section serve dashboard | professionals | patients sem criar N rotas.

function SectionDispatcher() {
  const { section } = useParams({ strict: false }) as { section?: string }
  switch (section) {
    case 'appointments':  return <AppointmentsPage />
    case 'professionals': return <ProfessionalsPage />
    case 'patients':      return <PatientsPage />
    case 'waitlist':       return <FeatureGate slug="waitlist"><WaitlistPage /></FeatureGate>
    case 'notifications':  return <FeatureGate slug="whatsapp"><NotificationsPage /></FeatureGate>
    case 'usuarios':       return <UsersPage />
    case 'whatsapp':       return <FeatureGate slug="whatsapp"><WhatsappPage /></FeatureGate>
    default:               return <DashboardPage />
  }
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({ component: () => <Outlet /> })

// ─── Super Admin ──────────────────────────────────────────────────────────────

const superAdminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/super-admin/login',
  component: SuperAdminLoginPage,
})

const superAdminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/super-admin',
  component: SuperAdminLayout,
  beforeLoad: requireSuperAdminAuth,
})

const superAdminIndexRoute = createRoute({
  getParentRoute: () => superAdminRoute,
  path: '/',
  component: TenantsPage,
})

const tenantsRoute = createRoute({
  getParentRoute: () => superAdminRoute,
  path: '/tenants',
  component: TenantsPage,
})

const newTenantRoute = createRoute({
  getParentRoute: () => superAdminRoute,
  path: '/tenants/new',
  component: NewTenantPage,
})

const plansRoute = createRoute({
  getParentRoute: () => superAdminRoute,
  path: '/plans',
  component: PlansPage,
})

const planDetailRoute = createRoute({
  getParentRoute: () => superAdminRoute,
  path: '/plans/$id',
  component: PlanDetailPage,
})

// ─── Clinic — rotas públicas (sem auth) ──────────────────────────────────────

const clinicLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/$slug/login',
  component: ClinicLoginPage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/$slug/forgot-password',
  component: ForgotPasswordPage,
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/$slug/reset-password',
  component: ResetPasswordPage,
})

// ─── Clinic — painel protegido ────────────────────────────────────────────────

const clinicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/$slug',
  component: ClinicLayout,
  beforeLoad: requireClinicAuth,
})

const clinicIndexRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/',
  component: DashboardPage,
})

// /app/:slug/dashboard | /professionals | /patients
const clinicSectionRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/$section',
  component: SectionDispatcher,
})

const newProfessionalRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/professionals/new',
  component: NewProfessionalPage,
})

const newPatientRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/patients/new',
  component: NewPatientPage,
})

const newAppointmentRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/appointments/new',
  component: NewAppointmentPage,
})

const editAppointmentRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/appointments/$id/edit',
  component: EditAppointmentPage,
})

const editProfessionalRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/professionals/$id/edit',
  component: EditProfessionalPage,
})

const patientProfileRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/patients/$id',
  component: ClinicPatientProfilePage,
})

const editPatientRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/patients/$id/edit',
  component: EditPatientPage,
})

const profileRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/profile',
  component: ProfilePage,
})

const changePasswordRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/change-password',
  component: ChangePasswordPage,
})

// ── Configurações: Procedimentos ─────────────────────────────────────────────

const proceduresRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/configuracoes/procedimentos',
  component: ProceduresPage,
})

const newProcedureRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/configuracoes/procedimentos/new',
  component: NewProcedurePage,
})

const editProcedureRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/configuracoes/procedimentos/$id/edit',
  component: EditProcedurePage,
})

// ── Configurações: Portal do Paciente ────────────────────────────────────────

const patientPortalConfigRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/configuracoes/portal-paciente',
  component: PatientPortalConfigPage,
})

// ── Configurações: Identidade Visual ─────────────────────────────────────────

const clinicIdentityRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/configuracoes/identidade-visual',
  component: ClinicSettingsPage,
})

// ── Horários de trabalho do profissional ─────────────────────────────────────

const workScheduleRoute = createRoute({
  getParentRoute: () => clinicRoute,
  path: '/professionals/$id/schedule',
  component: WorkSchedulePage,
})

// ─── Público — Booking ────────────────────────────────────────────────────────

const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$slug',
  component: BookingPage,
})

// ─── Patient Portal — Autenticação (rotas públicas) ───────────────────────────
//
// Rotas independentes de /$slug (não aninhadas) — TanStack Router resolve por
// número de segmentos. /$slug só faz match em 1 segmento; as abaixo têm 3+.

const patientLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$slug/minha-conta/login',
  component: PatientLoginPage,
})

const patientOtpLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$slug/minha-conta/entrar-com-whatsapp',
  component: PatientOtpLoginPage,
})

const patientForgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$slug/minha-conta/esqueci-senha',
  component: PatientForgotPasswordPage,
})

const patientResetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$slug/minha-conta/redefinir-senha',
  component: PatientResetPasswordPage,
})

// ─── Patient Portal — Área protegida ─────────────────────────────────────────
//
// Rota pai: /$slug/minha-conta  →  PatientPortalLayout (com Outlet)
// Filhos aninhados são prefixados automaticamente.
// beforeLoad protege todas as rotas filhas via cascata.

const patientPortalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$slug/minha-conta',
  component: PatientPortalLayout,
  beforeLoad: requirePatientPortalAuth,
})

const patientPortalIndexRoute = createRoute({
  getParentRoute: () => patientPortalRoute,
  path: '/',
  component: PatientDashboardPage,
})

const patientPortalSectionRoute = createRoute({
  getParentRoute: () => patientPortalRoute,
  path: '/$section',
  component: PatientPortalSection,
})

// ─── Route tree ───────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  superAdminLoginRoute,
  superAdminRoute.addChildren([
    superAdminIndexRoute,
    tenantsRoute,
    newTenantRoute,
    plansRoute,
    planDetailRoute,
  ]),
  clinicLoginRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  clinicRoute.addChildren([
    clinicIndexRoute,
    clinicSectionRoute,
    newProfessionalRoute,
    editProfessionalRoute,
    newPatientRoute,
    patientProfileRoute,
    editPatientRoute,
    newAppointmentRoute,
    editAppointmentRoute,
    profileRoute,
    changePasswordRoute,
    proceduresRoute,
    newProcedureRoute,
    editProcedureRoute,
    patientPortalConfigRoute,
    clinicIdentityRoute,
    workScheduleRoute,
  ]),
  publicRoute,
  patientLoginRoute,
  patientOtpLoginRoute,
  patientForgotPasswordRoute,
  