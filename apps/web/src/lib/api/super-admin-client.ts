// ─── Super Admin API Client ───────────────────────────────────────────────────
//
// Instância Axios separada da clínica — usa tokens próprios (sa_*) e
// redireciona para /super-admin/login em caso de 401.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios'

const SA_ACCESS_TOKEN_KEY  = 'sa_access_token'
const SA_REFRESH_TOKEN_KEY = 'sa_refresh_token'

export const saClient = axios.create({
  baseURL: import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333',
  headers: { 'Content-Type': 'application/json' },
})

// ── Injeta token de super admin ──────────────────────────────────────────────
saClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(SA_ACCESS_TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Refresh automático ───────────────────────────────────────────────────────
saClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem(SA_REFRESH_TOKEN_KEY)
        const { data } = await axios.post(
          `${import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333'}/super-admin/auth/refresh`,
          { refreshToken },
        )
        localStorage.setItem(SA_ACCESS_TOKEN_KEY, data.data.accessToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return saClient(original)
      } catch {
        localStorage.removeItem(SA_ACCESS_TOKEN_KEY)
        localStorage.removeItem(SA_REFRESH_TOKEN_KEY)
        window.location.href = '/super-admin/login'
      }
    }
    return Promise.reject(error)
  },
)

// ── Helpers para gerenciar tokens ────────────────────────────────────────────
export const saTokens = {
  set(accessToken: string, refreshToken: string) {
    localStorage.setItem(SA_ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(SA_REFRESH_TOKEN_KEY, refreshToken)
  },
  clear() {
    localStorage.removeItem(SA_ACCESS_TOKEN_KEY)
    localStorage.removeItem(SA_REFRESH_TOKEN_KEY)
  },
  getAccess() {
    return localStorage.getItem(SA_ACCESS_TOKEN_KEY)
  },
  getRefresh() {
    return localStorage.getItem(SA_REFRESH_TOKEN_KEY)
  },
}
