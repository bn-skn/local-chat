const config = require('./src/config/env');

console.log('Testing n8n integration v2 (No Bearer)...');
console.log('URL:', config.N8N_WEBHOOK_URL);
console.log('API Key:', config.N8N_API_KEY);

async function testN8N() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(config.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'authorization': config.N8N_API_KEY, // Исправленный заголовок
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Ping v2',
        session_id: 'debug-session'
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Body:', text);
    
    if (response.ok) {
        console.log('✅ Success! N8N accepted the request.');
        process.exit(0);
    } else {
        console.log('❌ Failed.');
        if (response.status === 404) {
            console.log('💡 Hint: 404 might mean the workflow is NOT ACTIVE. Please turn on "Active" toggle in n8n UI.');
        }
        process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testN8N();
