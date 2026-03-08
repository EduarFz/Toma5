const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function limpiar() {
  // Ver todos los procedimientos actuales
  const todos = await prisma.procedimiento.findMany({
    orderBy: { id: 'asc' },
  });

  console.log(`\n📋 Procedimientos en la BD (${todos.length} total):\n`);
  todos.forEach(p => {
    console.log(`  ID: ${p.id} | Activo: ${p.activo} | ${p.nombre}`);
  });

  // Nombres correctos que deben quedarse
  const nombresCorrectos = [
    'Operacion de equipo liviano',
    'Operacion de reguladora de balasto',
    'Operacion de tampeadora',
    'Operacion de pulidora de rieles',
    'Operacion de limpiadora de balasto',
    'Operacion de estabilizadora',
  ];

  // Identificar cuáles eliminar
  const aEliminar = todos.filter(p => !nombresCorrectos.includes(p.nombre));
  const aConservar = todos.filter(p => nombresCorrectos.includes(p.nombre));

  console.log(`\n✅ A conservar (${aConservar.length}):`);
  aConservar.forEach(p => console.log(`   ID: ${p.id} | ${p.nombre}`));

  console.log(`\n🗑️  A eliminar (${aEliminar.length}):`);
  aEliminar.forEach(p => console.log(`   ID: ${p.id} | ${p.nombre}`));

  if (aEliminar.length === 0) {
    console.log('\n✅ No hay procedimientos incorrectos. Todo está limpio.');
    await prisma.$disconnect();
    return;
  }

  // Eliminar los incorrectos
  const idsAEliminar = aEliminar.map(p => p.id);
  await prisma.procedimiento.deleteMany({
    where: { id: { in: idsAEliminar } },
  });

  console.log(`\n🎉 Eliminados ${aEliminar.length} procedimientos incorrectos.`);
  console.log('✅ Base de datos limpia.\n');

  await prisma.$disconnect();
}

limpiar().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
