# ТЗ: Схема базы данных — LocalChat

---

## 1. Общие правила проектирования

| Правило | Описание |
|---------|----------|
| Именование таблиц | `snake_case`, множественное число (`users`, `chats`, `messages`) |
| Именование колонок | `snake_case` |
| Первичные ключи | Тип `uuid`, имя `id` |
| Внешние ключи | Формат `<entity>_id` (например, `user_id`, `chat_id`) |
| Даты | Формат `date_<action>` (`date_created`, `date_updated`), тип `timestamp` |
| Значения по умолчанию | `date_created` = `CURRENT_TIMESTAMP`, enum'ы где применимо |
| Ограниченные значения | Использовать `enum` |
| Гибкие данные | Использовать `json` (при необходимости) |

---

## 2. Перечисления (Enums)

### 2.1. `message_role`

Роль автора сообщения в диалоге.

| Значение | Описание |
|----------|----------|
| `user` | Сообщение от пользователя |
| `assistant` | Ответ от нейросети (LLM) |

```sql
CREATE TYPE message_role AS ENUM ('user', 'assistant');
```

---

## 3. Таблицы

### 3.1. `users`

Учётные записи пользователей (аутентификация).

| Колонка | Тип | Ограничения | По умолчанию | Описание |
|---------|-----|-------------|--------------|----------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | Уникальный идентификатор |
| `username` | `varchar(50)` | `NOT NULL`, `UNIQUE` | — | Логин для входа |
| `password_hash` | `varchar(255)` | `NOT NULL` | — | Хэш пароля (bcrypt) |
| `date_created` | `timestamp` | `NOT NULL` | `CURRENT_TIMESTAMP` | Дата создания записи |
| `date_updated` | `timestamp` | `NOT NULL` | `CURRENT_TIMESTAMP` | Дата последнего обновления |

**Индексы:**
- `UNIQUE INDEX` на `username`

**Примечания:**
- Учётные записи создаются разработчиком напрямую в БД
- Пароль хранится в виде bcrypt-хэша

---

### 3.2. `profiles`

Профили пользователей (персональные данные).

| Колонка | Тип | Ограничения | По умолчанию | Описание |
|---------|-----|-------------|--------------|----------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | Уникальный идентификатор |
| `user_id` | `uuid` | `NOT NULL`, `UNIQUE`, `REFERENCES users(id) ON DELETE CASCADE` | — | Связь с пользователем |
| `first_name` | `varchar(100)` | `NULL` | `NULL` | Имя |
| `last_name` | `varchar(100)` | `NULL` | `NULL` | Фамилия |
| `date_created` | `timestamp` | `NOT NULL` | `CURRENT_TIMESTAMP` | Дата создания записи |
| `date_updated` | `timestamp` | `NOT NULL` | `CURRENT_TIMESTAMP` | Дата последнего обновления |

**Связи:**
- `user_id` → `users.id` (один к одному)

**Индексы:**
- `UNIQUE INDEX` на `user_id`

**Примечания:**
- Профиль создаётся автоматически при создании пользователя
- Имя и фамилия необязательны

---

### 3.3. `sessions`

Сессии авторизации пользователей.

| Колонка | Тип | Ограничения | По умолчанию | Описание |
|---------|-----|-------------|--------------|----------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | Уникальный идентификатор |
| `user_id` | `uuid` | `NOT NULL`, `REFERENCES users(id) ON DELETE CASCADE` | — | Связь с пользователем |
| `token` | `varchar(255)` | `NOT NULL`, `UNIQUE` | — | Токен сессии |
| `date_expires` | `timestamp` | `NOT NULL` | — | Дата истечения сессии |
| `date_created` | `timestamp` | `NOT NULL` | `CURRENT_TIMESTAMP` | Дата создания сессии |

**Связи:**
- `user_id` → `users.id` (многие к одному)

**Индексы:**
- `UNIQUE INDEX` на `token`
- `INDEX` на `user_id`
- `INDEX` на `date_expires` (для очистки истёкших сессий)

**Примечания:**
- Одновременно активна только одна сессия на пользователя
- При создании новой сессии — старые удаляются
- Время жизни сессии: 24 часа (`date_expires` = `date_created` + 24 hours)

---

### 3.4. `chats`

Диалоги (чаты) пользователей с нейросетью.

| Колонка | Тип | Ограничения | По умолчанию | Описание |
|---------|-----|-------------|--------------|----------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | Уникальный идентификатор |
| `user_id` | `uuid` | `NOT NULL`, `REFERENCES users(id) ON DELETE CASCADE` | — | Владелец чата |
| `chat_number` | `integer` | `NOT NULL` | — | Порядковый номер чата (для пользователя) |
| `title` | `varchar(100)` | `NOT NULL` | — | Название чата ("Чат №X") |
| `date_created` | `timestamp` | `NOT NULL` | `CURRENT_TIMESTAMP` | Дата создания чата |
| `date_updated` | `timestamp` | `NOT NULL` | `CURRENT_TIMESTAMP` | Дата последнего сообщения |

**Связи:**
- `user_id` → `users.id` (многие к одному)

**Индексы:**
- `INDEX` на `user_id`
- `UNIQUE INDEX` на `(user_id, chat_number)` — номер уникален в рамках пользователя
- `INDEX` на `date_updated` (для сортировки в списке)

**Примечания:**
- `chat_number` инкрементируется для каждого пользователя отдельно
- `title` формируется автоматически: `'Чат №' || chat_number`
- `date_updated` обновляется при каждом новом сообщении

---

### 3.5. `messages`

Сообщения в чатах.

| Колонка | Тип | Ограничения | По умолчанию | Описание |
|---------|-----|-------------|--------------|----------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | Уникальный идентификатор |
| `chat_id` | `uuid` | `NOT NULL`, `REFERENCES chats(id) ON DELETE CASCADE` | — | Связь с чатом |
| `role` | `message_role` | `NOT NULL` | — | Роль: `user` или `assistant` |
| `content` | `text` | `NOT NULL` | — | Текст сообщения |
| `date_created` | `timestamp` | `NOT NULL` | `CURRENT_TIMESTAMP` | Дата создания сообщения |

**Связи:**
- `chat_id` → `chats.id` (многие к одному)

**Индексы:**
- `INDEX` на `chat_id`
- `INDEX` на `(chat_id, date_created)` — для выборки сообщений в хронологическом порядке

**Примечания:**
- При удалении чата — все сообщения удаляются каскадно
- `content` хранит raw-текст (включая markdown-разметку)

---

## 4. Диаграмма связей (ERD)

```
┌─────────────┐       ┌─────────────┐
│   users     │       │  profiles   │
├─────────────┤       ├─────────────┤
│ id (PK)     │──┐    │ id (PK)     │
│ username    │  │    │ user_id (FK)│──┐
│ password_   │  │    │ first_name  │  │
│   hash      │  │    │ last_name   │  │
│ date_created│  │    │ date_created│  │
│ date_updated│  │    │ date_updated│  │
└─────────────┘  │    └─────────────┘  │
                 │           ▲         │
                 │           │ 1:1     │
                 └───────────┴─────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  sessions   │   │   chats     │
├─────────────┤   ├─────────────┤
│ id (PK)     │   │ id (PK)     │
│ user_id (FK)│   │ user_id (FK)│
│ token       │   │ chat_number │
│ date_expires│   │ title       │
│ date_created│   │ date_created│
└─────────────┘   │ date_updated│
                  └─────────────┘
                         │
                         │ 1:N
                         ▼
                  ┌─────────────┐
                  │  messages   │
                  ├─────────────┤
                  │ id (PK)     │
                  │ chat_id (FK)│
                  │ role (enum) │
                  │ content     │
                  │ date_created│
                  └─────────────┘
```

---

## 5. SQL-скрипт создания схемы

```sql
-- Перечисления
CREATE TYPE message_role AS ENUM ('user', 'assistant');

-- Таблица пользователей
CREATE TABLE users (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    username        varchar(50)     NOT NULL UNIQUE,
    password_hash   varchar(255)    NOT NULL,
    date_created    timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_updated    timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Таблица профилей
CREATE TABLE profiles (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name      varchar(100)    NULL,
    last_name       varchar(100)    NULL,
    date_created    timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_updated    timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Таблица сессий
CREATE TABLE sessions (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           varchar(255)    NOT NULL UNIQUE,
    date_expires    timestamp       NOT NULL,
    date_created    timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_date_expires ON sessions(date_expires);

-- Таблица чатов
CREATE TABLE chats (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_number     integer         NOT NULL,
    title           varchar(100)    NOT NULL,
    date_created    timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_updated    timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, chat_number)
);

CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_date_updated ON chats(date_updated);

-- Таблица сообщений
CREATE TABLE messages (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id         uuid            NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role            message_role    NOT NULL,
    content         text            NOT NULL,
    date_created    timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_chat_date ON messages(chat_id, date_created);

-- Триггер для автообновления date_updated
CREATE OR REPLACE FUNCTION update_date_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_date_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_date_updated();

CREATE TRIGGER trg_profiles_date_updated
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_date_updated();

CREATE TRIGGER trg_chats_date_updated
    BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_date_updated();
```

---

## 6. Типовые запросы

### 6.1. Создание пользователя (разработчиком)

```sql
-- Создание пользователя
INSERT INTO users (username, password_hash) 
VALUES ('ivan', '$2b$10$...hashed_password...')
RETURNING id;

-- Автоматическое создание профиля
INSERT INTO profiles (user_id) 
VALUES ('returned_user_id');
```

### 6.2. Получение списка чатов пользователя

```sql
SELECT id, chat_number, title, date_updated
FROM chats
WHERE user_id = :user_id
ORDER BY date_updated DESC;
```

### 6.3. Получение сообщений чата

```sql
SELECT id, role, content, date_created
FROM messages
WHERE chat_id = :chat_id
ORDER BY date_created ASC;
```

### 6.4. Создание нового чата

```sql
-- Получить следующий номер чата для пользователя
WITH next_number AS (
    SELECT COALESCE(MAX(chat_number), 0) + 1 AS num
    FROM chats
    WHERE user_id = :user_id
)
INSERT INTO chats (user_id, chat_number, title)
SELECT :user_id, num, 'Чат №' || num
FROM next_number
RETURNING id, chat_number, title;
```

### 6.5. Очистка истёкших сессий

```sql
DELETE FROM sessions
WHERE date_expires < CURRENT_TIMESTAMP;
```

---

## 7. Примечания по реализации

| Аспект | Рекомендация |
|--------|--------------|
| СУБД | PostgreSQL (для поддержки `uuid`, `enum`, триггеров) |
| Альтернатива | SQLite с адаптацией (без enum, uuid как text) |
| Миграции | Использовать Prisma / Drizzle / raw SQL |
| Пароли | bcrypt с cost factor ≥ 10 |
| Токены сессий | crypto.randomUUID() или аналог |
| Очистка сессий | Cron-задача или при каждом запросе авторизации |

---

Богдан, вот полное ТЗ для базы данных. Вопрос по реализации:

**Какую СУБД планируешь использовать?** PostgreSQL