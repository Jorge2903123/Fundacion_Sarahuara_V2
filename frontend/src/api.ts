import axios from 'axios'

const API_BASE = import.meta.env.PROD
  ? 'https://endearing-liberation-production-822c.up.railway.app'
  : '/api'

const api = axios.create({
  baseURL: API_BASE,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.dispatchEvent(new Event('auth:logout'))
    }
    if (err.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('auth:forbidden', { detail: err.response.data?.detail }))
    }
    return Promise.reject(err)
  },
)

export default api
