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
//  /:slug                          → Booking público (Grupo 7C)
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

// ── Public Booking ───────────────────────────────────────────────────────────
import { BookingPage } from '@/features/public-booking/BookingPage'

// ── Clinic ───────────────────────────────────────────────────────────────────
import { ClinicLayout } from '@/features/clinic/ClinicLayout'
import { requireClinicAuth } from '@/features/clinic/guards/ClinicGuard'
import { ClinicLoginPage } from '@/features/clinic/pages/LoginPage'
import { DashboardPage } from '@/features/clinic/pages/DashboardPage'
import { ProfessionalsPage } from '@/features/clinic/pages/ProfessionalsPage'
import { NewProfessionalPage } from '@/features/clinic/pages/NewProfessionalPage'
import { PatientsPage } from '@/features/clinic/pages/PatientsPage'
import { NewPatientPage } from '@/features/clinic/pages/NewPatientPage'
import { AppointmentsPage } from '@/features/clinic/pages/AppointmentsPage'
import { NewAppointmentPage } from '@/features/clinic/pages/NewAppointmentPage'
import { EditAppointmentPage } from '@/features/clinic/pages/EditAppointmentPage'
import { EditProfessionalPage } from '@/features/clinic/pages/EditProfessionalPage'
import { PatientProfilePage } from '@/features/clinic/pages/PatientProfilePage'
import { EditPatientPage } from '@/features/clinic/pages/EditPatientPage'
import { ProfilePage } from '@/features/clinic/pages/ProfilePage'
import { ChangePasswordPage } from '@/features/clinic/pages/ChangePasswordPage'
import { ProceduresPage } from '@/features/clinic/pages/ProceduresPage'
import { NewProcedurePage } from '@/features/clinic/pages/NewProcedurePage'
import { EditProcedurePage } from '@/features/clinic/pages/EditProcedurePage'

// ─── Dispatcher de seção ─────────────────────────────────────────────────────
// Rota /$section serve dashboard | professionals | patients sem criar N rotas.

function SectionDispatcher() {
  const { section } = useParams({ strict: false }) as { section?: string }
  switch (section) {
    case 'appointments':  return <AppointmentsPage />
    case 'professionals': return <ProfessionalsPage />
    case 'patients':      return <PatientsPage />
    default:              return <DashboardPage />
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

// ─── Clinic — login (pública) ─────────────────────────────────────────────────

const clinicLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/$slug/login',
  component: ClinicLoginPage,
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
  component: PatientProfilePage,
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

// ─── Público — Booking ────────────────────────────────────────────────────────

const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$slug',
  component: BookingPage,
})

// ─── Route tree ───────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  superAdminLoginRoute,
  superAdminRoute.addChildren([
    superAdminIndexRoute,
    tenantsRoute,
    newTenantRoute,
  ]),
  clinicLoginRoute,
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
  ]),
  publicRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
