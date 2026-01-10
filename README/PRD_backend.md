Отлично, вижу структуру workflow. Теперь напишу полное ТЗ по бэкенду и API.

---

# ТЗ: Бэкенд и API — Local Chat

---

## 1. Общая архитектура

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Frontend      │────▶│   Backend API   │────▶│   n8n Webhook   │
│   (React)       │     │   (Node.js)     │     │   (LLM)         │
│                 │◀────│                 │◀────│                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │                 │
                        │   PostgreSQL    │
                        │   (Docker)      │
                        │                 │
                        └─────────────────┘
```

---

## 2. Конфигурация

### 2.1. Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql://user:pass@localhost:5432/localchat` |
| `N8N_WEBHOOK_URL` | URL вебхука n8n | `http://31.192.110.228:5678/webhook/816c049c-7bde-41b5-886f-dc5f17755e32` |
| `N8N_API_KEY` | API-ключ для авторизации в n8n | `Bearer xxx` |
| `SESSION_SECRET` | Секрет для подписи токенов сессии | `random-secret-string` |
| `SESSION_TTL_HOURS` | Время жизни сессии в часах | `24` |
| `LLM_TIMEOUT_MS` | Таймаут запроса к LLM в мс | `150000` |
| `PORT` | Порт приложения | `3000` |

---

## 3. Интеграция с n8n Webhook

### 3.1. Спецификация запроса к n8n

**Endpoint:** `POST http://31.192.110.228:5678/webhook/816c049c-7bde-41b5-886f-dc5f17755e32`

**Headers:**
```
Authorization: Bearer {N8N_API_KEY}
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "string — текст сообщения пользователя",
  "session_id": "string — идентификатор чата (chat.id из БД)"
}
```

**Response (Success — 200):**
```json
{
  "status": "success",
  "output": "string — ответ LLM"
}
```

**Response (Error — 502):**
```json
{
  "status": "error",
  "error_message": "Ошибка работы LLM. обратитесь к разработчику"
}
```

### 3.2. Обработка ответов n8n в бэкенде

| HTTP Status | `status` | Действие |
|-------------|----------|----------|
| 200 | `success` | Сохранить `output` как сообщение assistant, вернуть клиенту |
| 200 | `error` | Вернуть ошибку клиенту с `error_message` |
| 502 | `error` | Вернуть ошибку "Нейросеть недоступна" |
| 5xx | — | Вернуть ошибку "Сервер временно недоступен" |
| Timeout | — | Вернуть ошибку "Превышено время ожидания" |
| Network Error | — | Вернуть ошибку "Ошибка соединения" |

---

## 4. API Endpoints

### 4.1. Обзор

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| `POST` | `/api/auth/login` | Вход в систему | ❌ |
| `POST` | `/api/auth/logout` | Выход из системы | ✅ |
| `GET` | `/api/auth/me` | Получить текущего пользователя | ✅ |
| `GET` | `/api/profile` | Получить профиль | ✅ |
| `PUT` | `/api/profile` | Обновить профиль | ✅ |
| `GET` | `/api/chats` | Список чатов пользователя | ✅ |
| `POST` | `/api/chats` | Создать новый чат | ✅ |
| `GET` | `/api/chats/:id` | Получить чат с сообщениями | ✅ |
| `DELETE` | `/api/chats/:id` | Удалить чат | ✅ |
| `POST` | `/api/chats/:id/messages` | Отправить сообщение | ✅ |

---

### 4.2. Аутентификация

#### `POST /api/auth/login`

Авторизация пользователя.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string",
    "first_name": "string | null",
    "last_name": "string | null"
  },
  "token": "string"
}
```

**Response (401):**
```json
{
  "success": false,
  "error": "Неверный логин или пароль"
}
```

**Логика:**
1. Найти пользователя по `username`
2. Проверить пароль через bcrypt.compare
3. Удалить все существующие сессии пользователя (одна активная сессия)
4. Создать новую сессию с `date_expires = now + 24h`
5. Вернуть токен сессии

---

#### `POST /api/auth/logout`

Выход из системы.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true
}
```

**Логика:**
1. Удалить сессию по токену из БД

---

#### `GET /api/auth/me`

Получить данные текущего пользователя (проверка сессии).

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string",
    "first_name": "string | null",
    "last_name": "string | null"
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "error": "Сессия истекла"
}
```

**Логика:**
1. Найти сессию по токену
2. Проверить `date_expires > now`
3. Вернуть данные пользователя с профилем

---

### 4.3. Профиль

#### `GET /api/profile`

Получить профиль текущего пользователя.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "user_id": "uuid",
    "username": "string",
    "first_name": "string | null",
    "last_name": "string | null",
    "date_created": "timestamp",
    "date_updated": "timestamp"
  }
}
```

---

#### `PUT /api/profile`

Обновить профиль.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "first_name": "string | null",
  "last_name": "string | null"
}
```

**Response (200):**
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "first_name": "string | null",
    "last_name": "string | null",
    "date_updated": "timestamp"
  }
}
```

**Логика:**
1. Обновить `profiles` по `user_id`
2. `date_updated` обновляется автоматически (триггер)

---

### 4.4. Чаты

#### `GET /api/chats`

Получить список чатов пользователя.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "chats": [
    {
      "id": "uuid",
      "chat_number": 5,
      "title": "Чат №5",
      "date_created": "timestamp",
      "date_updated": "timestamp"
    },
    {
      "id": "uuid",
      "chat_number": 4,
      "title": "Чат №4",
      "date_created": "timestamp",
      "date_updated": "timestamp"
    }
  ]
}
```

**Логика:**
1. `SELECT * FROM chats WHERE user_id = :user_id ORDER BY date_updated DESC`

---

#### `POST /api/chats`

Создать новый чат.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:** (пустое или опционально)
```json
{}
```

**Response (201):**
```json
{
  "success": true,
  "chat": {
    "id": "uuid",
    "chat_number": 6,
    "title": "Чат №6",
    "date_created": "timestamp",
    "date_updated": "timestamp"
  }
}
```

**Логика:**
1. Определить следующий `chat_number` для пользователя
2. Создать чат с `title = 'Чат №' + chat_number`

---

#### `GET /api/chats/:id`

Получить чат с историей сообщений.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "chat": {
    "id": "uuid",
    "chat_number": 5,
    "title": "Чат №5",
    "date_created": "timestamp",
    "date_updated": "timestamp"
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "Привет!",
      "date_created": "timestamp"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Привет! Чем могу помочь?",
      "date_created": "timestamp"
    }
  ]
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Чат не найден"
}
```

**Response (403):**
```json
{
  "success": false,
  "error": "Доступ запрещён"
}
```

**Логика:**
1. Найти чат по `id`
2. Проверить `chat.user_id === current_user.id`
3. Получить сообщения: `SELECT * FROM messages WHERE chat_id = :id ORDER BY date_created ASC`

---

#### `DELETE /api/chats/:id`

Удалить чат.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Чат не найден"
}
```

**Response (403):**
```json
{
  "success": false,
  "error": "Доступ запрещён"
}
```

**Логика:**
1. Проверить владельца чата
2. `DELETE FROM chats WHERE id = :id` (сообщения удалятся каскадно)

---

### 4.5. Сообщения

#### `POST /api/chats/:id/messages`

Отправить сообщение в чат и получить ответ от LLM.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "content": "string — текст сообщения"
}
```

**Response (200):**
```json
{
  "success": true,
  "user_message": {
    "id": "uuid",
    "role": "user",
    "content": "Привет!",
    "date_created": "timestamp"
  },
  "assistant_message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Привет! Чем могу помочь?",
    "date_created": "timestamp"
  }
}
```

**Response (504 — Timeout):**
```json
{
  "success": false,
  "error": "Превышено время ожидания ответа",
  "user_message": {
    "id": "uuid",
    "role": "user",
    "content": "Привет!",
    "date_created": "timestamp"
  }
}
```

**Response (502 — LLM Error):**
```json
{
  "success": false,
  "error": "Нейросеть недоступна",
  "user_message": {
    "id": "uuid",
    "role": "user",
    "content": "Привет!",
    "date_created": "timestamp"
  }
}
```

**Логика:**
```
1. Проверить владельца чата
2. Сохранить сообщение пользователя в БД (role: 'user')
3. Обновить chat.date_updated
4. Отправить запрос к n8n webhook:
   - URL: {N8N_WEBHOOK_URL}
   - Headers: Authorization: Bearer {N8N_API_KEY}
   - Body: { message: content, session_id: chat.id }
   - Timeout: 150 секунд
5. Обработать ответ:
   - Успех: сохранить ответ в БД (role: 'assistant'), вернуть оба сообщения
   - Ошибка: вернуть ошибку + сохранённое сообщение пользователя
6. Обновить chat.date_updated
```

---

#### `POST /api/chats/:id/messages/regenerate`

Регенерировать последний ответ ассистента.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:** (пустое)
```json
{}
```

**Response (200):**
```json
{
  "success": true,
  "assistant_message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Новый ответ от LLM",
    "date_created": "timestamp"
  }
}
```

**Логика:**
1. Найти последнее сообщение assistant в чате
2. Отправить повторный запрос к n8n с тем же контекстом
3. Обновить content существующего сообщения
4. Обновить chat.date_updated

---

## 5. Middleware

### 5.1. Auth Middleware

Проверка авторизации для защищённых роутов.

```javascript
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Требуется авторизация' 
    });
  }
  
  const session = await db.sessions.findByToken(token);
  
  if (!session || session.date_expires < new Date()) {
    return res.status(401).json({ 
      success: false, 
      error: 'Сессия истекла' 
    });
  }
  
  req.user = await db.users.findById(session.user_id);
  req.session = session;
  
  next();
}
```

### 5.2. Error Handler

Централизованная обработка ошибок.

```javascript
function errorHandler(err, req, res, next) {
  console.error(err);
  
  if (err.name === 'AbortError' || err.code === 'ETIMEDOUT') {
    return res.status(504).json({
      success: false,
      error: 'Превышено время ожидания ответа'
    });
  }
  
  if (err.code === 'ECONNREFUSED') {
    return res.status(502).json({
      success: false,
      error: 'Сервер временно недоступен'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера'
  });
}
```

---

## 6. Структура проекта (рекомендация)

```
/backend
├── src/
│   ├── config/
│   │   └── env.js              # Переменные окружения
│   ├── db/
│   │   ├── index.js            # Подключение к БД
│   │   ├── migrations/         # SQL миграции
│   │   └── queries/            # SQL запросы
│   ├── middleware/
│   │   ├── auth.js             # Auth middleware
│   │   └── errorHandler.js     # Error handler
│   ├── routes/
│   │   ├── auth.js             # /api/auth/*
│   │   ├── profile.js          # /api/profile
│   │   ├── chats.js            # /api/chats/*
│   │   └── index.js            # Router aggregator
│   ├── services/
│   │   ├── auth.service.js     # Логика авторизации
│   │   ├── chat.service.js     # Логика чатов
│   │   └── llm.service.js      # Интеграция с n8n
│   ├── utils/
│   │   ├── password.js         # bcrypt helpers
│   │   └── token.js            # Token generation
│   └── app.js                  # Express app
├── package.json
├── Dockerfile
└── .env.example
```

---

## 7. Безопасность

| Аспект | Реализация |
|--------|------------|
| Хранение паролей | bcrypt с cost factor ≥ 10 |
| Токены сессии | crypto.randomUUID() (256 бит) |
| SQL Injection | Parameterized queries |
| CORS | Ограничить origins |
| Rate Limiting | Опционально: 100 req/min на пользователя |
| Валидация | Проверка типов и длины всех входных данных |

---

## 8. Коды ошибок (сводка)

| HTTP Code | Описание | Когда |
|-----------|----------|-------|
| 200 | Успех | — |
| 201 | Создано | POST /api/chats |
| 400 | Bad Request | Невалидные данные |
| 401 | Unauthorized | Нет токена / сессия истекла |
| 403 | Forbidden | Доступ к чужому чату |
| 404 | Not Found | Чат не найден |
| 502 | Bad Gateway | n8n/Ollama недоступны |
| 504 | Gateway Timeout | Таймаут LLM (150 сек) |
| 500 | Internal Error | Непредвиденная ошибка |

---

## 9. Docker Compose (пример)

```yaml
version: '3.8'

services:
  localchat-app:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://localchat:password@db:5432/localchat
      - N8N_WEBHOOK_URL=http://31.192.110.228:5678/webhook/816c049c-7bde-41b5-886f-dc5f17755e32
      - N8N_API_KEY=${N8N_API_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
      - SESSION_TTL_HOURS=24
      - LLM_TIMEOUT_MS=150000
    depends_on:
      - db
    networks:
      - localchat-network

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=localchat
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=localchat
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - localchat-network

volumes:
  postgres_data:

networks:
  localchat-network:
    driver: bridge
```

---

Богдан, это полное ТЗ по бэкенду и API. Теперь у тебя есть полный комплект документации:

1. ✅ ТЗ пользовательских историй
2. ✅ ТЗ базы данных
3. ✅ ТЗ интерфейса и дизайна
4. ✅ ТЗ бэкенда и API

Хочешь, чтобы я собрал всё в единый PRD-документ, или нужно что-то уточнить/дополнить в отдельных секциях?