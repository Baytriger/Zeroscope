const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET',
  timeout: 5000,
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Health check response:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Health check non-JSON response:', data.slice(0, 1000));
    }
  });
});

req.on('error', (err) => {
  console.error('Health check request error:', err.message);
});

req.end();
