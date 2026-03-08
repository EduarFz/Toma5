const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearAdmin() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.usuario.create({
    data: {
      cedula: '000000000',
      carnet: 'ADMIN01',
      contrasena: hash,
      rol: 'ADMINISTRADOR',
      activo: true,
    }
  });
  console.log('✅ Administrador creado exitosamente');
  console.log('   Cédula: 000000000');
  console.log('   Contraseña: admin123');
  await prisma.$disconnect();
}

crearAdmin().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
