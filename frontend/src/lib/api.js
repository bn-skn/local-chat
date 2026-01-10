import axios from 'axios';

// Создаём экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Интерцептор для добавления токена авторизации
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор для обработки ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Никогда не делаем редирект, если мы уже на странице логина или это запрос авторизации
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    const isLoginPage = window.location.pathname === '/login';

    if (error.response?.status === 401 && !isLoginRequest && !isLoginPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API методы
export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  logout: () => 
    api.post('/auth/logout'),
  me: () => 
    api.get('/auth/me')
};

export const profileAPI = {
  get: () => 
    api.get('/profile'),
  update: (data) => 
    api.put('/profile', data)
};

export const chatsAPI = {
  getAll: () => 
    api.get('/chats'),
  create: () => 
    api.post('/chats'),
  get: (id) => 
    api.get(`/chats/${id}`),
  delete: (id) => 
    api.delete(`/chats/${id}`),
  sendMessage: (chatId, content, signal) => 
    api.post(`/chats/${chatId}/messages`, { content }, { signal }),
  regenerate: (chatId) => 
    api.post(`/chats/${chatId}/messages/regenerate`)
};

export default api;
