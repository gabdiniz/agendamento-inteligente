import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// ─── Request interceptor — injeta o token JWT ─────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor — trata expiração de token ─────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        const { data } = await axios.post('/auth/refresh', { refreshToken })
        localStorage.setItem('access_token', data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return apiClient(originalRequest)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/app/login'
      }
    }

    return Promise.reject(error)
  },
)
