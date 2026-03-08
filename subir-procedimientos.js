const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CARPETA_PDFS = 'C:\\Users\\eefs9\\Documents\\Toma5-Cerrejon\\Procedimientos';
const API_URL = 'http://localhost:3000';
const CEDULA_ADMIN = '000000000';
const CONTRASENA_ADMIN = 'admin123';

const PROCEDIMIENTOS = [
  {
    nombre: 'Operación de equipo liviano',
    descripcion: 'Procedimiento para la operación segura de equipo liviano en la UAS Equipos de Vías.',
    archivo: 'Operacion de equipo liviano.pdf',
  },
  {
    nombre: 'Operación de reguladora de balasto',
    descripcion: 'Procedimiento para la operación segura de la reguladora de balasto.',
    archivo: 'Operacion de reguladora de balasto.pdf',
  },
  {
    nombre: 'Operación de tampeadora',
    descripcion: 'Procedimiento para la operación segura de la tampeadora.',
    archivo: 'Operacion de tampeadora.pdf',
  },
  {
    nombre: 'Operación de pulidora de rieles',
    descripcion: 'Procedimiento para la operación segura de la pulidora de rieles.',
    archivo: 'Operacion de pulidora de rieles.pdf',
  },
  {
    nombre: 'Operación de limpiadora de balasto',
    descripcion: 'Procedimiento para la operación segura de la limpiadora de balasto.',
    archivo: 'Operacion de limpiadora de balasto.pdf',
  },
  {
    nombre: 'Operación de estabilizadora',
    descripcion: 'Procedimiento para la operación segura de la estabilizadora de vía.',
    archivo: 'Operacion de estabilizadora.pdf',
  },
];

async function subirProcedimientos() {
  console.log('📁 Carpeta de PDFs:', CARPETA_PDFS);
  console.log('🔐 Iniciando sesión como administrador...');

  let token;
  try {
    const loginResp = await axios.post(`${API_URL}/api/auth/login`, {
      cedula: CEDULA_ADMIN,
      contrasena: CONTRASENA_ADMIN,
    });
    token = loginResp.data.token;
    console.log('✅ Login exitoso\n');
  } catch (err) {
    console.error('❌ Error al iniciar sesión:', err.response?.data?.mensaje || err.message);
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${token}` };
  let exitosos = 0;
  let fallidos = 0;

  for (const proc of PROCEDIMIENTOS) {
    const rutaArchivo = path.join(CARPETA_PDFS, proc.archivo);

    if (!fs.existsSync(rutaArchivo)) {
      console.error(`❌ Archivo no encontrado: ${rutaArchivo}`);
      fallidos++;
      continue;
    }

    try {
      process.stdout.write(`📄 Subiendo: ${proc.nombre}... `);
      const buffer = fs.readFileSync(rutaArchivo);
      const base64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
      const nombreArchivo = proc.nombre.toLowerCase().replace(/ /g, '-');

      await axios.post(
        `${API_URL}/api/procedimientos`,
        {
          nombre: proc.nombre,
          descripcion: proc.descripcion,
          pdfBase64: base64,
          nombreArchivo: nombreArchivo,
        },
        { headers }
      );

      console.log('✅ OK');
      exitosos++;
    } catch (err) {
      console.log('❌ FALLÓ');
      console.error(`   Error: ${err.response?.data?.mensaje || err.message}`);
      fallidos++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Exitosos: ${exitosos}`);
  console.log(`❌ Fallidos: ${fallidos}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (exitosos > 0) {
    console.log('\n🎉 Procedimientos subidos correctamente a Cloudinary y registrados en la BD');
  }
}

subirProcedimientos();
