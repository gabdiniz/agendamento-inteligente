// ─── Router ───────────────────────────────────────────────────────────────────
//
// Definição da árvore de rotas com TanStack Router.
//
// Estrutura:
//   /super-admin/login          → LoginPage (pública)
//   /super-admin                → SuperAdminLayout (guard: requireSuperAdminAuth)
//     /super-admin/tenants      → TenantsPage
//     /super-admin/tenants/new  → NewTenantPage
//   /$slug                      → Página pública de agendamento (TODO)
//   /app                        → Painel clínica (TODO — Grupo 7B)
//     /app/login
//     /app/dashboard
// ─────────────────────────────────────────────────────────────────────────────

import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router'

import { SuperAdminLayout } from '@/features/super-admin/SuperAdminLayout'
import { requireSuperAdminAuth } from '@/features/super-admin/guards/SuperAdminGuard'
import { LoginPage } from '@/features/super-admin/pages/LoginPage'
import { TenantsPage } from '@/features/super-admin/pages/TenantsPage'
import { NewTenantPage } from '@/features/super-admin/pages/NewTenantPage'

// ─── Root ─────────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// ─── Super Admin — login (pública) ───────────────────────────────────────────

const superAdminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/super-admin/login',
  component: LoginPage,
})

// ─── Super Admin — área protegida ────────────────────────────────────────────

const superAdminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/super-admin',
  component: SuperAdminLayout,
  beforeLoad: requireSuperAdminAuth,
})

const superAdminIndexRoute = createRoute({
  getParentRoute: () => superAdminRoute,
  path: '/',
  // Redireciona /super-admin → /super-admin/tenants
  component: () => {
    // Redirect handled via navigate on mount — keep simple for now
    return <TenantsPage />
  },
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

// ─── Public routes (/{slug}) ──────────────────────────────────────────────────

const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$slug',
  component: () => <div>Página pública de agendamento — TODO (Grupo 7C)</div>,
})

// ─── App routes (/app/**) — Painel da clínica (Grupo 7B) ─────────────────────

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: () => <Outlet />,
})

const appLoginRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/login',
  component: () => <div>Login Clínica — TODO (Grupo 7B)</div>,
})

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/dashboard',
  component: () => <div>Dashboard Clínica — TODO (Grupo 7B)</div>,
})

// ─── Route tree ───────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  // Super Admin
  superAdminLoginRoute,
  superAdminRoute.addChildren([
    superAdminIndexRoute,
    tenantsRoute,
    newTenantRoute,
  ]),
  // Público
  publicRoute,
  // Painel clínica
  appRoute.addChildren([appLoginRoute, dashboardRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
