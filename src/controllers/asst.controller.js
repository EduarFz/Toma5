const prisma = require('../config/database');
const { subirImagen } = require('../config/cloudinary');

/**
 * SUBIR ASST (2 fotos)
 * POST /api/asst
 * Body: {
 *   tareaId,
 *   foto1: "data:image/jpeg;base64,...",
 *   foto2: "data:image/jpeg;base64,..."
 * }
 */
const subirAsst = async (req, res, next) => {
  try {
    const { tareaId, foto1, foto2 } = req.body;
    const usuarioActual = req.usuario;

    // Validar datos básicos
    if (!tareaId || !foto1 || !foto2) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Se requieren tareaId y las 2 fotos',
      });
    }

    // Verificar que el usuario sea trabajador
    if (usuarioActual.rol !== 'TRABAJADOR') {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'Solo los trabajadores pueden subir ASST',
      });
    }

    // Buscar el trabajador
    const trabajador = await prisma.trabajador.findUnique({
      where: { usuarioId: usuarioActual.id },
    });

    // Verificar que la tarea existe y pertenece al trabajador
    const tarea = await prisma.tarea.findUnique({
      where: { id: tareaId },
      include: {
        toma5: {
          include: {
            asst: true,
          },
        },
      },
    });

    if (!tarea) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: 'Tarea no encontrada',
      });
    }

    if (tarea.trabajadorId !== trabajador.id) {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'Esta tarea no está asignada a ti',
      });
    }

    // Verificar que la tarea tiene un Toma 5
    if (!tarea.toma5) {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: 'Esta tarea no tiene un Toma 5 asociado',
      });
    }

    // Verificar que el Toma 5 requiere ASST
    if (!tarea.toma5.requiereAsst) {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: 'Este Toma 5 no requiere ASST',
      });
    }

    // Verificar que el Toma 5 está aprobado
    if (!tarea.toma5.aprobado) {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: 'El Toma 5 debe estar aprobado antes de subir el ASST',
      });
    }

    // Verificar que la tarea está en estado correcto
if (tarea.estado !== 'PENDIENTE_ASST') {
  return res.status(400).json({
    error: 'Estado inválido',
    mensaje: 'La tarea debe estar en estado PENDIENTE_ASST',
  });
}


    // Validar formato de las fotos (base64)
    if (!foto1.startsWith('data:image/')) {
      return res.status(400).json({
        error: 'Formato inválido',
        mensaje: 'foto1 debe estar en formato base64 (data:image/...)',
      });
    }

    if (!foto2.startsWith('data:image/')) {
      return res.status(400).json({
        error: 'Formato inválido',
        mensaje: 'foto2 debe estar en formato base64 (data:image/...)',
      });
    }

    // Subir las fotos a Cloudinary
    console.log('Subiendo foto 1 a Cloudinary...');
    const resultadoFoto1 = await subirImagen(foto1, 'toma5/asst');

    console.log('Subiendo foto 2 a Cloudinary...');
    const resultadoFoto2 = await subirImagen(foto2, 'toma5/asst');

    // Si ya existe un ASST, actualizarlo. Si no, crear uno nuevo
    let asst;

if (tarea.toma5.asst) {
  // Actualizar ASST existente
  asst = await prisma.asst.update({
    where: { id: tarea.toma5.asst.id },
    data: {
      foto1Url: resultadoFoto1.url,
      foto2Url: resultadoFoto2.url,
      fechaCarga: new Date(),
    },
  });
} else {
  // Crear nuevo ASST
  asst = await prisma.asst.create({
    data: {
      toma5Id: tarea.toma5.id,
      foto1Url: resultadoFoto1.url,
      foto2Url: resultadoFoto2.url,
      fechaCarga: new Date(),
    },
  });
}


    // Actualizar el estado de la tarea a LISTA_PARA_INICIAR
await prisma.tarea.update({
  where: { id: tareaId },
  data: {
    estado: 'LISTA_PARA_INICIAR',
  },
});

    // Emitir notificación al supervisor
    if (tarea.supervisorId) {
      const supervisor = await prisma.supervisor.findUnique({
        where: { id: tarea.supervisorId },
      });
      const io = req.app.get('io');
      io.to(`usuario-${supervisor.usuarioId}`).emit('asst-subido', {
        mensaje: 'Un trabajador ha completado el ASST',
        tareaId: tarea.id,
        asstId: asst.id,
        trabajadorNombre: trabajador.nombreCompleto,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({
  mensaje: 'ASST subido exitosamente. La tarea está lista para iniciar.',
  asst: {
    id: asst.id,
    toma5Id: asst.toma5Id,
    foto1Url: asst.foto1Url,
    foto2Url: asst.foto2Url,
    fechaCarga: asst.fechaCarga,
  },
  tarea: {
    id: tarea.id,
    nuevoEstado: 'LISTA_PARA_INICIAR',
  },
});

  } catch (error) {
    next(error);
  }
};

/**
 * OBTENER ASST POR TAREA ID
 * GET /api/asst/tarea/:tareaId
 */
const obtenerAsstPorTarea = async (req, res, next) => {
  try {
    const { tareaId } = req.params;

    // Buscar la tarea con su Toma 5 y ASST
    const tarea = await prisma.tarea.findUnique({
      where: { id: parseInt(tareaId) },
      include: {
        toma5: {
          include: {
            asst: true,
          },
        },
      },
    });

    if (!tarea) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: 'Tarea no encontrada',
      });
    }

    if (!tarea.toma5) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: 'Esta tarea no tiene un Toma 5 asociado',
      });
    }

    if (!tarea.toma5.asst) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: 'Esta tarea no tiene un ASST asociado',
      });
    }

    res.json({
  asst: {
    id: tarea.toma5.asst.id,
    toma5Id: tarea.toma5.asst.toma5Id,
    foto1Url: tarea.toma5.asst.foto1Url,
    foto2Url: tarea.toma5.asst.foto2Url,
    fechaCarga: tarea.toma5.asst.fechaCarga,
  },
});

  } catch (error) {
    next(error);
  }
};

module.exports = {
  subirAsst,
  obtenerAsstPorTarea,
};
