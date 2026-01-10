const db = require('../db');
const LLMService = require('./llm.service');

/**
 * In-memory очередь для последовательной обработки запросов к LLM.
 * Ollama и n8n настроены на однопоточную работу, поэтому запросы
 * должны выполняться строго по одному.
 */
class QueueService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.cancelledChats = new Set(); // Хранит ID чатов, для которых отменена генерация
  }

  /**
   * Добавить задачу в очередь
   * @param {Object} task - { chatId, messageContent, userMessageId }
   */
  add(task) {
    // Если для этого чата была отмена, убираем её флаг при новой задаче
    if (this.cancelledChats.has(task.chatId)) {
      this.cancelledChats.delete(task.chatId);
    }
    
    this.queue.push(task);
    console.log(`[Queue] Добавлена задача для чата ${task.chatId}. Всего в очереди: ${this.queue.length}`);
    this.process();
  }

  /**
   * Отменить задачу для чата
   * @param {string} chatId 
   */
  cancel(chatId) {
    console.log(`[Queue] Запрос на отмену для чата ${chatId}`);
    this.cancelledChats.add(chatId);
    
    // Если задача ещё в очереди (не начали обрабатывать) — удаляем её
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(task => task.chatId !== chatId);
    
    if (this.queue.length < initialLength) {
      console.log(`[Queue] Задача для чата ${chatId} удалена из очереди.`);
    } else {
      console.log(`[Queue] Задача для чата ${chatId} уже обрабатывается или не найдена. Результат будет отброшен.`);
    }
  }

  /**
   * Обработка очереди (запускается автоматически)
   */
  async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const task = this.queue.shift();

    // Проверка отмены ПЕРЕД началом обработки
    if (this.cancelledChats.has(task.chatId)) {
      console.log(`[Queue] Задача для чата ${task.chatId} была отменена перед началом. Пропускаем.`);
      await this.resetChatStatus(task.chatId);
      this.cancelledChats.delete(task.chatId);
      this.isProcessing = false;
      this.process();
      return;
    }

    console.log(`[Queue] Обработка задачи для чата ${task.chatId}. Осталось: ${this.queue.length}`);

    try {
      // Устанавливаем статус "generating" для чата
      await db.query(
        `UPDATE chats SET status = 'generating', date_updated = CURRENT_TIMESTAMP WHERE id = $1`,
        [task.chatId]
      );

      // Отправляем запрос к LLM
      const llmResponse = await LLMService.sendMessage(task.messageContent, task.chatId);

      // Проверка отмены ПОСЛЕ получения ответа (самое важное для "Стоп")
      if (this.cancelledChats.has(task.chatId)) {
        console.log(`[Queue] Задача для чата ${task.chatId} была отменена во время генерации. Результат отброшен.`);
        await this.resetChatStatus(task.chatId);
        this.cancelledChats.delete(task.chatId);
        return; // Выходим без сохранения сообщения
      }

      if (llmResponse.success) {
        // Сохраняем ответ ассистента
        await db.query(
          `INSERT INTO messages (chat_id, role, content) VALUES ($1, 'assistant', $2)`,
          [task.chatId, llmResponse.output]
        );

        // Обновляем статус чата: готово, есть непрочитанное
        await db.query(
          `UPDATE chats SET status = 'idle', has_unread = true, date_updated = CURRENT_TIMESTAMP WHERE id = $1`,
          [task.chatId]
        );

        console.log(`[Queue] Задача для чата ${task.chatId} выполнена успешно`);
      } else {
        // Ошибка LLM — сохраняем сообщение об ошибке как ответ ассистента
        const errorMessage = llmResponse.error || 'Ошибка генерации ответа';
        await db.query(
          `INSERT INTO messages (chat_id, role, content) VALUES ($1, 'assistant', $2)`,
          [task.chatId, `⚠️ ${errorMessage}`]
        );

        await db.query(
          `UPDATE chats SET status = 'idle', has_unread = true, date_updated = CURRENT_TIMESTAMP WHERE id = $1`,
          [task.chatId]
        );

        console.error(`[Queue] Ошибка для чата ${task.chatId}:`, errorMessage);
      }
    } catch (error) {
      console.error(`[Queue] Критическая ошибка для чата ${task.chatId}:`, error);
      await this.resetChatStatus(task.chatId);
    } finally {
      this.isProcessing = false;
      // Продолжаем обработку, если есть ещё задачи
      this.process();
    }
  }

  /**
   * Сбросить статус чата в idle (вспомогательный метод)
   */
  async resetChatStatus(chatId) {
    try {
      await db.query(
        `UPDATE chats SET status = 'idle', date_updated = CURRENT_TIMESTAMP WHERE id = $1`,
        [chatId]
      );
    } catch (e) {
      console.error('[Queue] Не удалось сбросить статус:', e);
    }
  }

  /**
   * Получить текущий размер очереди
   */
  size() {
    return this.queue.length;
  }
}

// Singleton instance
module.exports = new QueueService();
