const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const LLMService = require('../services/llm.service');
const QueueService = require('../services/queue.service');

// Все роуты требуют авторизации
router.use(authMiddleware);

/**
 * GET /api/chats
 * Получить список чатов пользователя
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, chat_number, title, status, has_unread, date_created, date_updated
       FROM chats 
       WHERE user_id = $1 
       ORDER BY date_updated DESC`,
      [req.user.id]
    );
    
    res.json({
      success: true,
      chats: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chats
 * Создать новый чат
 */
router.post('/', async (req, res, next) => {
  try {
    // Получаем следующий номер чата для пользователя
    const numberResult = await db.query(
      `SELECT COALESCE(MAX(chat_number), 0) + 1 as next_number
       FROM chats 
       WHERE user_id = $1`,
      [req.user.id]
    );
    
    const nextNumber = numberResult.rows[0].next_number;
    const title = `Чат №${nextNumber}`;
    
    const result = await db.query(
      `INSERT INTO chats (user_id, chat_number, title)
       VALUES ($1, $2, $3)
       RETURNING id, chat_number, title, date_created, date_updated`,
      [req.user.id, nextNumber, title]
    );
    
    res.status(201).json({
      success: true,
      chat: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chats/:id
 * Получить чат с историей сообщений
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Получаем чат
    const chatResult = await db.query(
      `SELECT id, chat_number, title, status, has_unread, date_created, date_updated, user_id
       FROM chats 
       WHERE id = $1`,
      [id]
    );
    
    if (chatResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Чат не найден'
      });
    }
    
    const chat = chatResult.rows[0];
    
    // Проверка владельца
    if (chat.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещён'
      });
    }
    
    // Сбрасываем флаг непрочитанных сообщений при открытии чата
    if (chat.has_unread) {
      await db.query(
        `UPDATE chats SET has_unread = false WHERE id = $1`,
        [id]
      );
    }
    
    // Получаем сообщения
    const messagesResult = await db.query(
      `SELECT id, role, content, date_created
       FROM messages 
       WHERE chat_id = $1 
       ORDER BY date_created ASC`,
      [id]
    );
    
    res.json({
      success: true,
      chat: {
        id: chat.id,
        chat_number: chat.chat_number,
        title: chat.title,
        status: chat.status,
        has_unread: false, // Уже сброшен
        date_created: chat.date_created,
        date_updated: chat.date_updated
      },
      messages: messagesResult.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/chats/:id
 * Удалить чат
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверяем владельца
    const chatResult = await db.query(
      `SELECT user_id FROM chats WHERE id = $1`,
      [id]
    );
    
    if (chatResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Чат не найден'
      });
    }
    
    if (chatResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещён'
      });
    }
    
    // Удаляем чат (сообщения удалятся каскадно)
    await db.query('DELETE FROM chats WHERE id = $1', [id]);
    
    res.json({
      success: true
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chats/:id/messages
 * Отправить сообщение в чат (асинхронная обработка через очередь)
 */
router.post('/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Сообщение не может быть пустым'
      });
    }
    
    // Проверяем владельца чата
    const chatResult = await db.query(
      `SELECT user_id, status FROM chats WHERE id = $1`,
      [id]
    );
    
    if (chatResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Чат не найден'
      });
    }
    
    if (chatResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещён'
      });
    }
    
    // Проверяем, не идёт ли уже генерация в этом чате
    if (chatResult.rows[0].status === 'generating') {
      return res.status(409).json({
        success: false,
        error: 'В этом чате уже идёт генерация. Дождитесь завершения.'
      });
    }
    
    // Сохраняем сообщение пользователя
    const userMessageResult = await db.query(
      `INSERT INTO messages (chat_id, role, content)
       VALUES ($1, 'user', $2)
       RETURNING id, role, content, date_created`,
      [id, content.trim()]
    );
    
    const userMessage = userMessageResult.rows[0];
    
    // Обновляем статус чата на "generating"
    await db.query(
      `UPDATE chats SET status = 'generating', date_updated = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    
    // Добавляем задачу в очередь (обработка будет фоновой)
    QueueService.add({
      chatId: id,
      messageContent: content.trim(),
      userMessageId: userMessage.id
    });
    
    // Сразу отвечаем клиенту — не ждём LLM!
    res.status(202).json({
      success: true,
      status: 'queued',
      user_message: userMessage,
      queue_position: QueueService.size()
    });
    
  } catch (error) {
    next(error);
  }

});

/**
 * POST /api/chats/:id/cancel
 * Отменить текущую генерацию для чата
 */
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверяем владельца
    const chatResult = await db.query(
      `SELECT user_id FROM chats WHERE id = $1`,
      [id]
    );

    if (chatResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Чат не найден' });
    }

    if (chatResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Доступ запрещён' });
    }

    // Вызываем отмену в сервисе очереди
    QueueService.cancel(id);
    
    // Сбрасываем статус в БД на случай рассинхрона
    await db.query(
      `UPDATE chats SET status = 'idle' WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Generation cancelled' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chats/:id/messages/regenerate
 * Регенерировать последний ответ ассистента
 */
router.post('/:id/messages/regenerate', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверяем владельца чата
    const chatResult = await db.query(
      `SELECT user_id FROM chats WHERE id = $1`,
      [id]
    );
    
    if (chatResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Чат не найден'
      });
    }
    
    if (chatResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещён'
      });
    }
    
    // Находим последнее сообщение пользователя
    const lastUserMessage = await db.query(
      `SELECT content FROM messages 
       WHERE chat_id = $1 AND role = 'user' 
       ORDER BY date_created DESC 
       LIMIT 1`,
      [id]
    );
    
    if (lastUserMessage.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Нет сообщений для регенерации'
      });
    }
    
    // Отправляем повторный запрос к LLM
    const llmResponse = await LLMService.sendMessage(
      lastUserMessage.rows[0].content, 
      id
    );
    
    if (!llmResponse.success) {
      return res.status(502).json({
        success: false,
        error: llmResponse.error
      });
    }
    
    // Находим последнее сообщение ассистента и обновляем его
    const updateResult = await db.query(
      `UPDATE messages 
       SET content = $1, date_created = CURRENT_TIMESTAMP
       WHERE id = (
         SELECT id FROM messages 
         WHERE chat_id = $2 AND role = 'assistant' 
         ORDER BY date_created DESC 
         LIMIT 1
       )
       RETURNING id, role, content, date_created`,
      [llmResponse.output, id]
    );
    
    // Обновляем date_updated чата
    await db.query(
      `UPDATE chats SET date_updated = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    
    res.json({
      success: true,
      assistant_message: updateResult.rows[0]
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
