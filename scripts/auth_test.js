const http = require('http');
const querystring = require('querystring');

const HOST = 'localhost';
const PORT = 3000;

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ res, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function register() {
  const postData = querystring.stringify({
    username: 'autotestuser',
    email: 'autotest+1@example.com',
    password: 'pass123',
    confirmPassword: 'pass123'
  });

  const options = {
    hostname: HOST,
    port: PORT,
    path: '/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    }
  };

  const { res, body } = await request(options, postData);
  return { res, body, setCookie: res.headers['set-cookie'] };
}

async function login() {
  const postData = querystring.stringify({
    email: 'autotest+1@example.com',
    password: 'pass123'
  });

  const options = {
    hostname: HOST,
    port: PORT,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    }
  };

  const { res, body } = await request(options, postData);
  return { res, body, setCookie: res.headers['set-cookie'] };
}

async function fetchDashboard(cookie) {
  const options = {
    hostname: HOST,
    port: PORT,
    path: '/',
    method: 'GET',
    headers: cookie ? { Cookie: cookie } : {}
  };
  const { res, body } = await request(options);
  return { res, body };
}

(async () => {
  try {
    console.log('Attempting registration...');
    const reg = await register();
    console.log('Register status:', reg.res.statusCode, 'set-cookie:', reg.setCookie ? reg.setCookie[0] : 'none');

    const cookie = reg.setCookie ? reg.setCookie.map(c => c.split(';')[0]).join('; ') : null;

    console.log('Fetching dashboard with session cookie...');
    const dash = await fetchDashboard(cookie);
    console.log('Dashboard GET status:', dash.res.statusCode);
    console.log('Dashboard body snippet:', dash.body.slice(0, 1200));

    console.log('\nNow attempting login (in case register redirected)...');
    const lg = await login();
    console.log('Login status:', lg.res.statusCode, 'set-cookie:', lg.setCookie ? lg.setCookie[0] : 'none');

    const cookie2 = lg.setCookie ? lg.setCookie.map(c => c.split(';')[0]).join('; ') : cookie;
    console.log('Fetching dashboard after login...');
    const dash2 = await fetchDashboard(cookie2);
    console.log('Dashboard GET status after login:', dash2.res.statusCode);
    console.log('Dashboard body snippet after login:', dash2.body.slice(0, 1200));
  } catch (err) {
    console.error('Test script error:', err);
  }
})();
