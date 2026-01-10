const { Pool } = require('pg');
const config = require('../config/env');

const pool = new Pool({
  connectionString: config.DATABASE_URL
});

// Проверка подключения при старте
pool.on('connect', () => {
  console.log('✅ Подключение к PostgreSQL установлено');
});

pool.on('error', (err) => {
  console.error('❌ Ошибка подключения к PostgreSQL:', err);
  process.exit(-1);
});

// Хелпер для выполнения запросов
const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('📊 Выполнен запрос:', { text: text.substring(0, 50), duration: `${duration}ms`, rows: result.rowCount });
  return result;
};

// Транзакционный хелпер
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = {
  pool,
  query,
  getClient
};
