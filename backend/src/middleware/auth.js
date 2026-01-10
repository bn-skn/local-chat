const db = require('../db');

/**
 * Middleware для проверки авторизации
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Требуется авторизация'
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Поиск сессии по токену
    const sessionResult = await db.query(
      `SELECT s.*, u.id as user_id, u.username, p.first_name, p.last_name
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE s.token = $1`,
      [token]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Сессия не найдена'
      });
    }
    
    const session = sessionResult.rows[0];
    
    // Проверка срока действия сессии
    if (new Date(session.date_expires) < new Date()) {
      // Удаляем истёкшую сессию
      await db.query('DELETE FROM sessions WHERE id = $1', [session.id]);
      
      return res.status(401).json({
        success: false,
        error: 'Сессия истекла'
      });
    }
    
    // Добавляем данные пользователя в request
    req.user = {
      id: session.user_id,
      username: session.username,
      first_name: session.first_name,
      last_name: session.last_name
    };
    req.session = {
      id: session.id,
      token: session.token
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка авторизации'
    });
  }
};

module.exports = authMiddleware;
