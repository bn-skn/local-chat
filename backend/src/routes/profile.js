const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Все роуты требуют авторизации
router.use(authMiddleware);

/**
 * GET /api/profile
 * Получить профиль текущего пользователя
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.username 
       FROM profiles p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Профиль не найден'
      });
    }
    
    res.json({
      success: true,
      profile: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/profile
 * Обновить профиль
 */
router.put('/', async (req, res, next) => {
  try {
    const { first_name, last_name } = req.body;
    
    const result = await db.query(
      `UPDATE profiles 
       SET first_name = $1, last_name = $2, date_updated = CURRENT_TIMESTAMP
       WHERE user_id = $3
       RETURNING id, first_name, last_name, date_updated`,
      [first_name || null, last_name || null, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Профиль не найден'
      });
    }
    
    res.json({
      success: true,
      profile: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
