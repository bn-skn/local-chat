const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Хэширование пароля
 */
const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Проверка пароля
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword
};
