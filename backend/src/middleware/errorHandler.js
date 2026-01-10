/**
 * Централизованный обработчик ошибок
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Ошибка:', err);
  
  // Таймаут (AbortError)
  if (err.name === 'AbortError' || err.code === 'ETIMEDOUT') {
    return res.status(504).json({
      success: false,
      error: 'Превышено время ожидания ответа'
    });
  }
  
  // Ошибка подключения
  if (err.code === 'ECONNREFUSED') {
    return res.status(502).json({
      success: false,
      error: 'Сервер временно недоступен'
    });
  }
  
  // Ошибка сети
  if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
    return res.status(502).json({
      success: false,
      error: 'Ошибка соединения'
    });
  }
  
  // Общая ошибка
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера'
  });
};

module.exports = errorHandler;
