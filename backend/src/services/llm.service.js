const config = require('../config/env');

/**
 * Сервис для интеграции с n8n/LLM
 */
class LLMService {
  /**
   * Отправка сообщения к LLM через n8n webhook
   * @param {string} message - Текст сообщения пользователя
   * @param {string} sessionId - ID чата (для контекста диалога)
   * @returns {Promise<{success: boolean, output?: string, error?: string}>}
   */
  static async sendMessage(message, sessionId) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.LLM_TIMEOUT_MS);
    
    try {
      const response = await fetch(config.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'authorization': config.N8N_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          session_id: sessionId
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Обработка ошибок HTTP
      if (!response.ok) {
        if (response.status === 502) {
          return {
            success: false,
            error: 'Нейросеть недоступна'
          };
        }
        return {
          success: false,
          error: 'Сервер временно недоступен'
        };
      }
      
      const data = await response.json();
      
      // Обработка ответа от n8n
      if (data.status === 'error') {
        return {
          success: false,
          error: data.error_message || 'Ошибка работы LLM'
        };
      }
      
      return {
        success: true,
        output: data.output
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Превышено время ожидания ответа'
        };
      }
      
      console.error('LLM Service Error:', error);
      return {
        success: false,
        error: 'Ошибка соединения с нейросетью'
      };
    }
  }
}

module.exports = LLMService;
