import axios from 'axios';

const DEFAULT_API_URL = 'http://127.0.0.1:8000/api/';

function normalizeBaseUrl(url) {
  const value = typeof url === 'string' ? url.trim() : '';
  return `${(value || DEFAULT_API_URL).replace(/\/+$/, '')}/`;
}

const api = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_URL),
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el token JWT en cada request automaticamente.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof config.url === 'string') {
    config.url = config.url.replace(/^\/+/, '');
  }
  return config;
});

// Si el token expira (401), limpia sesion y redirige al login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
