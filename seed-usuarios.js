const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USUARIOS = [
  // SUPERVISOR
  {
    cedula: '1098765432',
    carnet: '38541',
    rol: 'SUPERVISOR',
    nombreCompleto: 'Yilfran Vargas',
  },
  // TURNO CARDENALES
  { cedula: '1003456781', carnet: '52341', rol: 'TRABAJADOR', nombreCompleto: 'Elkin Marín', turno: 'Cardenales' },
  { cedula: '1003456782', carnet: '63724', rol: 'TRABAJADOR', nombreCompleto: 'Heliberto Ochoa', turno: 'Cardenales' },
  { cedula: '1003456783', carnet: '41892', rol: 'TRABAJADOR', nombreCompleto: 'José Sarmiento', turno: 'Cardenales' },
  { cedula: '1003456784', carnet: '76105', rol: 'TRABAJADOR', nombreCompleto: 'Atilio Pérez', turno: 'Cardenales' },
  { cedula: '1003456785', carnet: '29463', rol: 'TRABAJADOR', nombreCompleto: 'John García', turno: 'Cardenales' },
  { cedula: '1122407658', carnet: '94276', rol: 'TRABAJADOR', nombreCompleto: 'Eduardo Fernández', turno: 'Cardenales' },
  { cedula: '1003456786', carnet: '85019', rol: 'TRABAJADOR', nombreCompleto: 'Eduardo Mejía', turno: 'Cardenales' },
  { cedula: '1003456787', carnet: '13674', rol: 'TRABAJADOR', nombreCompleto: 'José Barraza', turno: 'Cardenales' },
  { cedula: '1003456788', carnet: '90752', rol: 'TRABAJADOR', nombreCompleto: 'Emerson Díaz', turno: 'Cardenales' },
  { cedula: '1003456789', carnet: '46831', rol: 'TRABAJADOR', nombreCompleto: 'Rafael Solano', turno: 'Cardenales' },
  // TURNO VALIENTES
  { cedula: '1003456790', carnet: '71245', rol: 'TRABAJADOR', nombreCompleto: 'Andrés Fuenmayor', turno: 'Valientes' },
  { cedula: '1003456791', carnet: '38526', rol: 'TRABAJADOR', nombreCompleto: 'Rodrigo Polo', turno: 'Valientes' },
  { cedula: '1003456792', carnet: '64918', rol: 'TRABAJADOR', nombreCompleto: 'Carlos de la Oz', turno: 'Valientes' },
  { cedula: '1003456793', carnet: '57042', rol: 'TRABAJADOR', nombreCompleto: 'Orángel Solano', turno: 'Valientes' },
  { cedula: '1003456794', carnet: '82463', rol: 'TRABAJADOR', nombreCompleto: 'Héctor Yoles', turno: 'Valientes' },
  { cedula: '1003456795', carnet: '19537', rol: 'TRABAJADOR', nombreCompleto: 'Héctor Acosta', turno: 'Valientes' },
  { cedula: '1003456796', carnet: '73680', rol: 'TRABAJADOR', nombreCompleto: 'Hamilton Acosta', turno: 'Valientes' },
  { cedula: '1003456797', carnet: '48291', rol: 'TRABAJADOR', nombreCompleto: 'Luis Cruz', turno: 'Valientes' },
  { cedula: '1003456798', carnet: '95016', rol: 'TRABAJADOR', nombreCompleto: 'Obdulio Mendoza', turno: 'Valientes' },
  { cedula: '1003456799', carnet: '36482', rol: 'TRABAJADOR', nombreCompleto: 'Isaac Borja', turno: 'Valientes' },
];

async function seed() {
  console.log('\n🌱 Iniciando seed de usuarios reales...\n');

  let creados = 0;
  let omitidos = 0;

  for (const u of USUARIOS) {
    // Verificar si ya existe
    const existe = await prisma.usuario.findUnique({ where: { cedula: u.cedula } });
    if (existe) {
      console.log(`⏭️  Ya existe: ${u.nombreCompleto} (${u.cedula})`);
      omitidos++;
      continue;
    }

    // La contraseña inicial es el carnet
    const hash = await bcrypt.hash(u.carnet, 10);

    const usuario = await prisma.usuario.create({
      data: {
        cedula: u.cedula,
        carnet: u.carnet,
        contrasena: hash,
        rol: u.rol,
        activo: true,
      },
    });

    // Crear perfil según rol
    if (u.rol === 'SUPERVISOR') {
      await prisma.supervisor.create({
        data: {
          usuarioId: usuario.id,
          nombreCompleto: u.nombreCompleto,
          departamento: 'Manejo de Carbón',
          superintendencia: 'Ferrocarril',
          uas: 'Equipos de Vías',
        },
      });
    } else {
      await prisma.trabajador.create({
        data: {
          usuarioId: usuario.id,
          nombreCompleto: u.nombreCompleto,
          cargo: 'Técnico Operador',
          turno: u.turno,
          disponibleHoy: true,
          departamento: 'Manejo de Carbón',
          superintendencia: 'Ferrocarril',
          uas: 'Equipos de Vías',
        },
      });
    }

    console.log(`✅ Creado: ${u.nombreCompleto} | ${u.rol} | Cédula: ${u.cedula} | Contraseña: ${u.carnet}`);
    creados++;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Creados: ${creados}`);
  console.log(`⏭️  Omitidos (ya existían): ${omitidos}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();
}

seed().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
