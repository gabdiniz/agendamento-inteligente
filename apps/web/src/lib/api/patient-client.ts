// ─── Patient API Client ───────────────────────────────────────────────────────
//
// Axios instance para o portal do paciente.
// Tokens são armazenados por slug: pa_<slug> e pr_<slug>.
// Isso permite que um paciente tenha sessão em múltiplas clínicas
// no mesmo navegador sem conflito.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios'
import { BASE_URL } from './client'

// ─── Token helpers ────────────────────────────────────────────────────────────

export const patientTokens = {
  setAccess: (slug: string, token: string) => localStorage.setItem(`pa_${slug}`, token),
  setRefresh: (slug: string, token: string) => localStorage.setItem(`pr_${slug}`, token),
  set: (slug: string, accessToken: string, refreshToken: string) => {
    localStorage.setItem(`pa_${slug}`, accessToken)
    localStorage.setItem(`pr_${slug}`, refreshToken)
  },
  clear: (slug: string) => {
    localStorage.removeItem(`pa_${slug}`)
    localStorage.removeItem(`pr_${slug}`)
  },
  getAccess: (slug: string) => localStorage.getItem(`pa_${slug}`),
  getRefresh: (slug: string) => localStorage.getItem(`pr_${slug}`),
  isAuthenticated: (slug: string) => Boolean(localStorage.getItem(`pa_${slug}`)),
}

// ─── Factory ──────────────────────────────────────────────────────────────────
//
// Cria um cliente axios vinculado a um slug de tenant.
// Todas as rotas do paciente são prefixadas com /t/:slug automaticamente.
// ─────────────────────────────────────────────────────────────────────────────

export function createPatientClient(slug: string) {
  const client = axios.create({
    baseURL: `${BASE_URL}/t/${slug}`,
    headers: { 'Content-Type': 'application/json' },
  })

  // ── Request: injeta token ──────────────────────────────────────────────────
  client.interceptors.request.use((config) => {
    const token = patientTokens.getAccess(slug)
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  // ── Response: refresh em 401 ──────────────────────────────────────────────
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      const isAuthEndpoint =
        originalRequest?.url?.includes('/patient-auth/login') ||
        originalRequest?.url?.includes('/patient-auth/refresh')

      if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true

        try {
          const refreshToken = patientTokens.getRefresh(slug)
          const { data } = await axios.post(
            `${BASE_URL}/t/${slug}/patient-auth/refresh`,
            { refreshToken },
          )
          const { accessToken, refreshToken: newRefresh } = data.data
          patientTokens.set(slug, accessToken, newRefresh)
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return client(originalRequest)
        } catch {
          patientTokens.clear(slug)
          window.location.href = `/${slug}/minha-conta/login`
        }
      }

      return Promise.reject(error)
    },
  )

  return client
}
