// ─── Clinic API Client ────────────────────────────────────────────────────────
//
// Axios instance para o painel da clínica.
// Injeta JWT (Authorization) e x-tenant-slug em todas as requisições.
// Em 401, tenta refresh automático e redireciona para login se falhar.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios'

// Helpers de token — chaves isoladas do Super Admin
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

export const apiClient = axios.create({
  baseURL: import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333',
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor — injeta JWT e tenant slug ───────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = clinicTokens.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`

  const slug = clinicTokens.getSlug()
  if (slug) config.headers['x-tenant-slug'] = slug

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
          `${import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333'}/auth/refresh`,
          { refreshToken },
          { headers: { 'x-tenant-slug': slug } },
        )
        clinicTokens.set(data.data.accessToken, data.data.refreshToken, slug)
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`
        return apiClient(originalRequest)
      } catch {
        clinicTokens.clear()
        const slug = clinicTokens.getSlug() ?? ''
        window.location.href = `/app/${slug}/login`
      }
    }

    return Promise.reject(error)
  },
)
