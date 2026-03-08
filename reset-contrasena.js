const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reset() {
  // Resetear contraseña de TODOS los usuarios a su carnet
  const usuarios = await prisma.usuario.findMany({
    where: { rol: { in: ['SUPERVISOR', 'TRABAJADOR'] } },
    include: { supervisor: true, trabajador: true },
  });

  console.log(`\n🔄 Reseteando contraseñas de ${usuarios.length} usuarios...\n`);

  for (const u of usuarios) {
    const nombre = u.supervisor?.nombreCompleto || u.trabajador?.nombreCompleto || u.cedula;
    const hash = await bcrypt.hash(u.carnet, 10);

    await prisma.usuario.update({
      where: { id: u.id },
      data: { contrasena: hash },
    });

    console.log(`✅ ${nombre} | Cédula: ${u.cedula} | Nueva contraseña: ${u.carnet}`);
  }

  console.log('\n🎉 Todas las contraseñas reseteadas al carnet correctamente.\n');
  await prisma.$disconnect();
}

reset().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
