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

-- Перечисление статусов чата
CREATE TYPE chat_status AS ENUM ('idle', 'generating');

-- Таблица чатов
CREATE TABLE chats (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_number     integer         NOT NULL,
    title           varchar(100)    NOT NULL,
    status          chat_status     NOT NULL DEFAULT 'idle',
    has_unread      boolean         NOT NULL DEFAULT false,
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

-- Тестовый пользователь (пароль: admin123)
-- Хэш сгенерирован через bcrypt с 10 раундами
INSERT INTO users (username, password_hash) 
VALUES ('admin', '$2b$10$rQZ5QmJ4LqY3VqvM0xW8XuQQ8YmE0jVG5k0qZ8v.J0KqR5N8Kf1Hy');

-- Профиль тестового пользователя
INSERT INTO profiles (user_id, first_name, last_name)
SELECT id, 'Администратор', NULL FROM users WHERE username = 'admin';
