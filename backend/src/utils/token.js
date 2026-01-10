const { v4: uuidv4 } = require('uuid');

/**
 * Генерация токена сессии
 */
const generateSessionToken = () => {
  return uuidv4();
};

module.exports = {
  generateSessionToken
};
