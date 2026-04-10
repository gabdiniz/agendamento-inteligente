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

// ── Clinic ───────────────────────────────────────────────────────────────────
import { ClinicLayout } from '@/features/clinic/ClinicLayout'
import { requireClinicAuth } from '@/features/clinic/guards/ClinicGuard'
import { ClinicLoginPage } from '@/features/clinic/pages/LoginPage'
import { DashboardPage } from '@/features/clinic/pages/DashboardPage'
import { ProfessionalsPage } from '@/features/clinic/pages/ProfessionalsPage'
import { NewProfessionalPage } from '@/features/clinic/pages/NewProfessionalPage'
import { PatientsPage } from '@/features/clinic/pages/PatientsPage'
import { NewPatientPage } from '@/features/clinic/pages/NewPatientPage'

// ─── Dispatcher de seção ─────────────────────────────────────────────────────
// Rota /$section serve dashboard | professionals | patients sem criar N rotas.

function SectionDispatcher() {
  const { section } = useParams({ strict: false }) as { section?: string }
  switch (section) {
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

// ─── Público — Grupo 7C ───────────────────────────────────────────────────────

const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$slug',
  component: () => <div>Página pública de agendamento — Grupo 7C</div>,
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
    newPatientRoute,
  ]),
  publicRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
