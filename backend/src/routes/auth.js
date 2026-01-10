const express = require('express');
const router = express.Router();
const db = require('../db');
const { comparePassword } = require('../utils/password');
const { generateSessionToken } = require('../utils/token');
const config = require('../config/env');
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Авторизация пользователя
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    // Валидация
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Укажите логин и пароль'
      });
    }
    
    // Поиск пользователя
    const userResult = await db.query(
      `SELECT u.*, p.first_name, p.last_name 
       FROM users u 
       LEFT JOIN profiles p ON p.user_id = u.id 
       WHERE u.username = $1`,
      [username]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль'
      });
    }
    
    const user = userResult.rows[0];
    
    // Проверка пароля
    const isPasswordValid = await comparePassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль'
      });
    }
    
    // Удаление старых сессий пользователя (одна активная сессия)
    await db.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    
    // Создание новой сессии
    const token = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.SESSION_TTL_HOURS);
    
    await db.query(
      `INSERT INTO sessions (user_id, token, date_expires) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name
      },
      token
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Выход из системы
 */
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    await db.query('DELETE FROM sessions WHERE id = $1', [req.session.id]);
    
    res.json({
      success: true
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Получить данные текущего пользователя
 */
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
