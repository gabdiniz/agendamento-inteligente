// ─── Clinic API Client ────────────────────────────────────────────────────────
//
// Axios instance para o painel da clínica.
//
// Rotas do tenant ficam em /t/:slug/* no backend.
// O interceptor de request prefixa automaticamente com /t/:slug quando
// o slug está armazenado e a URL ainda não possui esse prefixo.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios'

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333'

// ─── Token helpers ────────────────────────────────────────────────────────────

export const clinicTokens = {
  set(accessToken: string, refreshToken: string, slug: string) {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('tenant_slug', slug)
  },
  clear() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('tenant_slug')
  },
  getAccess: () => localStorage.getItem('access_token'),
  getRefresh: () => localStorage.getItem('refresh_token'),
  getSlug: () => localStorage.getItem('tenant_slug'),
}

// ─── Axios instance ───────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor ──────────────────────────────────────────────────────
// Injeta JWT e prefixa a URL com /t/:slug quando necessário.

apiClient.interceptors.request.use((config) => {
  const token = clinicTokens.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`

  // Prefixa com /t/:slug se a URL não for de super-admin e o slug existir
  const slug = clinicTokens.getSlug()
  if (slug && config.url && !config.url.startsWith('/t/') && !config.url.startsWith('/super-admin')) {
    config.url = `/t/${slug}${config.url}`
  }

  return config
})

// ─── Response interceptor — refresh em 401 ───────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const slug = clinicTokens.getSlug() ?? ''
        const refreshToken = clinicTokens.getRefresh()
        const { data } = await axios.post(
          `${BASE_URL}/t/${slug}/auth/refresh`,
          { refreshToken },
        )
        clinicTokens.set(data.data.accessToken, data.data.refreshToken, slug)
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`
        return apiClient(originalRequest)
      } catch {
        const slug = clinicTokens.getSlug() ?? ''
        clinicTokens.clear()
        window.location.href = `/app/${slug}/login`
      }
    }

    return Promise.reject(error)
  },
)
