const config = require('./src/config/env');

console.log('Debugging n8n integration...');
console.log('URL:', config.N8N_WEBHOOK_URL);
console.log('API Key:', config.N8N_API_KEY ? `${config.N8N_API_KEY.substring(0, 4)}... (len=${config.N8N_API_KEY.length})` : 'MISSING');

async function tryRequest(headers, description) {
  console.log(`\n--- Trying ${description} ---`);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(config.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        message: 'Ping from Local Chat debugger',
        session_id: 'debug-session'
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Body:', text);
    
    if (response.ok) {
        try {
            const data = JSON.parse(text);
            if (data.output) return true;
        } catch (e) {}
        return true;
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
  return false;
}

async function runTests() {
    // 1. As is (Bearer + Key)
    let success = await tryRequest({
        'Authorization': `Bearer ${config.N8N_API_KEY}`
    }, 'Authorization: Bearer <Key>');
    
    if (success) {
        console.log('\n✅ CORRECT METHOD: Authorization: Bearer <Key>');
        process.exit(0);
    }

    // 2. Raw Key in Authorization
    success = await tryRequest({
        'Authorization': config.N8N_API_KEY
    }, 'Authorization: <Key>');

    if (success) {
        console.log('\n✅ CORRECT METHOD: Authorization: <Key>');
        console.log('ACTION REQUIRED: Remove "Bearer " prefix in source code.');
        process.exit(0);
    }

    // 3. X-API-Key header
    success = await tryRequest({
        'X-API-Key': config.N8N_API_KEY
    }, 'X-API-Key: <Key>');

    if (success) {
        console.log('\n✅ CORRECT METHOD: X-API-Key: <Key>');
        console.log('ACTION REQUIRED: Change header name in source code.');
        process.exit(0);
    }

    console.error('\n❌ ALL METHODS FAILED. Check your API Key or N8N configuration.');
    process.exit(1);
}

runTests();
