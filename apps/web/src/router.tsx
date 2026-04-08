import { createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router'

// ─── Root ─────────────────────────────────────────────────────────────────
const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// ─── Public routes (/{slug}) ──────────────────────────────────────────────
// Página pública de agendamento — sem autenticação
const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$slug',
  component: () => <div>Página pública — TODO</div>,
})

// ─── App routes (/app/**) ─────────────────────────────────────────────────
// Painel autenticado (Gestor, Profissional, Recepção, Super Admin)
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: () => <Outlet />,
})

const loginRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/login',
  component: () => <div>Login — TODO</div>,
})

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/dashboard',
  component: () => <div>Dashboard — TODO</div>,
})

// ─── Route tree ───────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  publicRoute,
  appRoute.addChildren([loginRoute, dashboardRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
