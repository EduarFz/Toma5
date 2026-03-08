const axios = require('axios');

async function test() {
  try {
    const resp = await axios.post('http://localhost:3000/api/auth/login', {
      cedula: '000000000',
      contrasena: 'admin123',
    });
    console.log('✅ Login OK');
    console.log('Token:', resp.data.token ? 'RECIBIDO' : 'NO RECIBIDO');
    console.log('Usuario:', resp.data.usuario);
  } catch (err) {
    console.error('❌ Error:', err.response?.status, JSON.stringify(err.response?.data));
    console.error('   Mensaje de red:', err.message);
  }
}

test();
