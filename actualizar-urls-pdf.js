const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function actualizarUrls() {
  const procedimientos = await prisma.procedimiento.findMany();

  console.log(`\n📋 Actualizando ${procedimientos.length} procedimientos...\n`);

  for (const p of procedimientos) {
    const urlVieja = p.urlPdf;
    const urlNueva = urlVieja.replace('/raw/upload/', '/raw/upload/fl_attachment/');

    if (urlVieja === urlNueva) {
      console.log(`⏭️  Sin cambios: ${p.nombre}`);
      continue;
    }

    await prisma.procedimiento.update({
      where: { id: p.id },
      data: { urlPdf: urlNueva },
    });

    console.log(`✅ Actualizado: ${p.nombre}`);
    console.log(`   Nueva URL: ${urlNueva}\n`);
  }

  console.log('🎉 URLs actualizadas correctamente.');
  await prisma.$disconnect();
}

actualizarUrls().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
