// Скрипт для створення admin користувача напряму в MongoDB через backend API
const fetch = require('node-fetch');

async function createAdmin() {
  const res = await fetch('https://simple-shop-spa-server.onrender.com/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin',
      name: 'Адміністратор',
      role: 'admin'
    })
  });
  const data = await res.json();
  console.log('Створення admin:', data);
}

createAdmin();
