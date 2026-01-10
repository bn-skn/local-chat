require('dotenv').config();

module.exports = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  
  // n8n Integration
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
  N8N_API_KEY: process.env.N8N_API_KEY,
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'default-secret',
  SESSION_TTL_HOURS: parseInt(process.env.SESSION_TTL_HOURS) || 24,
  
  // LLM
  LLM_TIMEOUT_MS: parseInt(process.env.LLM_TIMEOUT_MS) || 150000,
  
  // Server
  PORT: parseInt(process.env.PORT) || 3000
};
