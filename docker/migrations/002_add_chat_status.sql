-- Миграция v2: Добавление статуса генерации и флага непрочитанных сообщений

-- Создаем enum для статуса чата
CREATE TYPE chat_status AS ENUM ('idle', 'generating');

-- Добавляем колонки в таблицу chats
ALTER TABLE chats 
ADD COLUMN status chat_status NOT NULL DEFAULT 'idle',
ADD COLUMN has_unread BOOLEAN NOT NULL DEFAULT false;

-- Индекс для быстрой фильтрации по статусу (для мониторинга очереди)
CREATE INDEX idx_chats_status ON chats(status) WHERE status = 'generating';
