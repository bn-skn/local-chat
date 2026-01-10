const config = require('./src/config/env');

console.log('Testing n8n integration...');
console.log('URL:', config.N8N_WEBHOOK_URL);
// Не выводим полный ключ в логи для безопасности, только первые/последние символы или длину
console.log('API Key length:', config.N8N_API_KEY ? config.N8N_API_KEY.length : 0);

async function testN8N() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sec timeout for test

    console.log('Sending request...');
    const response = await fetch(config.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.N8N_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Привет! Это тестовое сообщение. Ответь кратко "Работает".',
        session_id: 'test-session-123'
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.error('Request failed with status:', response.status);
      const text = await response.text();
      console.error('Response body:', text);
      process.exit(1);
    }
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.status === 'error') {
        console.error('N8N returned error:', data.error_message);
        process.exit(1);
    }

    if (data.output) {
        console.log('✅ Success! Output received:', data.output);
        process.exit(0);
    } else {
        console.warn('⚠️ Warning: No "output" field in response.');
        process.exit(0);
    }

  } catch (error) {
    console.error('❌ Error testing n8n:', error.message);
    if (error.cause) console.error('Cause:', error.cause);
    process.exit(1);
  }
}

testN8N();
