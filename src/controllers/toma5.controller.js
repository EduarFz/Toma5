const prisma = require('../config/database');

/**
 * ENVIAR TOMA 5
 * POST /api/toma5
 * Body: {
 *   tareaId,
 *   respuestas: [{ paso, pregunta, respuesta }],
 *   procedimientoId (opcional),
 *   peligrosAdicionales (opcional),
 *   comentarios (opcional)
 * }
 */
const enviarToma5 = async (req, res, next) => {
  try {
    const { tareaId, respuestas, procedimientoId, peligrosAdicionales, comentarios } = req.body;
    const usuarioActual = req.usuario;

    // Validar datos básicos
    if (!tareaId || !respuestas || !Array.isArray(respuestas)) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Se requiere tareaId y respuestas (array)',
      });
    }

    // Verificar que el usuario sea trabajador
    if (usuarioActual.rol !== 'TRABAJADOR') {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'Solo los trabajadores pueden diligenciar el Toma 5',
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
        toma5: true,
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

    // Verificar que la tarea no tenga ya un Toma 5 aprobado
    if (tarea.toma5 && tarea.toma5.aprobado === true) {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: 'Esta tarea ya tiene un Toma 5 aprobado',
      });
    }

    // Verificar que la tarea no esté cancelada
    if (tarea.estado === 'CANCELADA' || tarea.estado === 'CANCELADA_AUTOMATICAMENTE') {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: 'No se puede diligenciar Toma 5 para una tarea cancelada',
      });
    }

    // Determinar si requiere ASST
    // Según requerimientos: respuestas NO en pasos 2, 3 o 4
    const requiereAsst = respuestas.some(
      (r) => (r.paso === 2 || r.paso === 3 || r.paso === 4) && r.respuesta === false
    );

    // Si ya existe un Toma 5, actualizarlo. Si no, crear uno nuevo
    let toma5;

    if (tarea.toma5) {
      // Actualizar el Toma 5 existente
      toma5 = await prisma.toma5.update({
        where: { id: tarea.toma5.id },
        data: {
          trabajadorId: trabajador.id,
          fechaDiligenciamiento: new Date(),
          procedimientoId: procedimientoId || null,
          peligrosAdicionales: peligrosAdicionales || null,
          comentarios: comentarios || null,
          requiereAsst: requiereAsst,
          aprobado: null, // Reset aprobación
          fechaRevision: null,
          observacionesSupervisor: null,
        },
      });

      // Eliminar respuestas anteriores
      await prisma.toma5Respuesta.deleteMany({
        where: { toma5Id: toma5.id },
      });

      // Crear las nuevas respuestas
      await prisma.toma5Respuesta.createMany({
        data: respuestas.map((r) => ({
          toma5Id: toma5.id,
          paso: r.paso,
          pregunta: r.pregunta,
          respuesta: r.respuesta,
        })),
      });
    } else {
      // Crear nuevo Toma 5
      toma5 = await prisma.toma5.create({
        data: {
          tareaId: tareaId,
          trabajadorId: trabajador.id,
          fechaDiligenciamiento: new Date(),
          procedimientoId: procedimientoId || null,
          peligrosAdicionales: peligrosAdicionales || null,
          comentarios: comentarios || null,
          requiereAsst: requiereAsst,
        },
      });

      // Crear las respuestas
      await prisma.toma5Respuesta.createMany({
        data: respuestas.map((r) => ({
          toma5Id: toma5.id,
          paso: r.paso,
          pregunta: r.pregunta,
          respuesta: r.respuesta,
        })),
      });
    }

    // Actualizar el estado de la tarea
    await prisma.tarea.update({
      where: { id: tareaId },
      data: {
        estado: 'TOMA5_ENVIADO',
      },
    });

    // Emitir notificación al supervisor
    if (tarea.supervisorId) {
      const supervisor = await prisma.supervisor.findUnique({
        where: { id: tarea.supervisorId },
      });
      const io = req.app.get('io');
      io.to(`usuario-${supervisor.usuarioId}`).emit('toma5-enviado', {
        mensaje: 'Un trabajador ha enviado un Toma 5 para revisión',
        tareaId: tarea.id,
        toma5Id: toma5.id,
        trabajadorNombre: trabajador.nombreCompleto,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({
      mensaje: 'Toma 5 enviado exitosamente',
      toma5: {
        id: toma5.id,
        tareaId: toma5.tareaId,
        requiereAsst: toma5.requiereAsst,
        fechaDiligenciamiento: toma5.fechaDiligenciamiento,
      },
    });
  } catch (error) {
    next(error);
  }
};


/**
 * OBTENER TOMA 5 POR ID
 * GET /api/toma5/:id
 */
const obtenerToma5 = async (req, res, next) => {
  try {
    const { id } = req.params;

    const toma5 = await prisma.toma5.findUnique({
      where: { id: parseInt(id) },
      include: {
        tarea: {
          include: {
            trabajador: {
              include: {
                usuario: {
                  select: { cedula: true, carnet: true },
                },
              },
            },
            supervisor: {
              include: {
                usuario: {
                  select: { cedula: true },
                },
              },
            },
          },
        },
        trabajador: {
          include: {
            usuario: {
              select: { cedula: true, carnet: true },
            },
          },
        },
        procedimiento: true,
        respuestas: {
          orderBy: {
            paso: 'asc',
          },
        },
        asst: true,
      },
    });

    if (!toma5) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: 'Toma 5 no encontrado',
      });
    }

    res.json({
      toma5: {
        id: toma5.id,
        tareaId: toma5.tareaId,
        aprobado: toma5.aprobado,
        requiereAsst: toma5.requiereAsst,
        peligrosAdicionales: toma5.peligrosAdicionales,
        comentarios: toma5.comentarios,
        fechaDiligenciamiento: toma5.fechaDiligenciamiento,
        fechaRevision: toma5.fechaRevision,
        observacionesSupervisor: toma5.observacionesSupervisor,
        tarea: toma5.tarea ? {
          id: toma5.tarea.id,
          descripcion: toma5.tarea.descripcion,
          lugar: toma5.tarea.lugar,
          trabajador: toma5.tarea.trabajador ? {
            id: toma5.tarea.trabajador.id,
            nombreCompleto: toma5.tarea.trabajador.nombreCompleto,
            cedula: toma5.tarea.trabajador.usuario.cedula,
          } : null,
          supervisor: toma5.tarea.supervisor ? {
            id: toma5.tarea.supervisor.id,
            nombreCompleto: toma5.tarea.supervisor.nombreCompleto,
          } : null,
        } : null,
        trabajador: toma5.trabajador ? {
          id: toma5.trabajador.id,
          nombreCompleto: toma5.trabajador.nombreCompleto,
          cedula: toma5.trabajador.usuario.cedula,
        } : null,
        procedimiento: toma5.procedimiento ? {
          id: toma5.procedimiento.id,
          nombre: toma5.procedimiento.nombre,
          urlPdf: toma5.procedimiento.urlPdf,
        } : null,
        respuestas: toma5.respuestas,
        asst: toma5.asst ? {
  id: toma5.asst.id,
  foto1Url: toma5.asst.foto1Url,
  foto2Url: toma5.asst.foto2Url,
  fechaCarga: toma5.asst.fechaCarga,
} : null,


      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * OBTENER TOMA 5 POR TAREA ID
 * GET /api/toma5/tarea/:tareaId
 */
const obtenerToma5PorTarea = async (req, res, next) => {
  try {
    const { tareaId } = req.params;

    const toma5 = await prisma.toma5.findUnique({
      where: { tareaId: parseInt(tareaId) },
      include: {
        trabajador: {
          include: {
            usuario: {
              select: { cedula: true, carnet: true },
            },
          },
        },
        procedimiento: true,
        respuestas: {
          orderBy: {
            paso: 'asc',
          },
        },
        asst: true,
      },
    });

    if (!toma5) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: 'Esta tarea no tiene un Toma 5 asociado',
      });
    }

    res.json({
      toma5: {
        id: toma5.id,
        tareaId: toma5.tareaId,
        aprobado: toma5.aprobado,
        requiereAsst: toma5.requiereAsst,
        peligrosAdicionales: toma5.peligrosAdicionales,
        comentarios: toma5.comentarios,
        fechaDiligenciamiento: toma5.fechaDiligenciamiento,
        fechaRevision: toma5.fechaRevision,
        observacionesSupervisor: toma5.observacionesSupervisor,
        trabajador: toma5.trabajador ? {
          id: toma5.trabajador.id,
          nombreCompleto: toma5.trabajador.nombreCompleto,
          cedula: toma5.trabajador.usuario.cedula,
        } : null,
        procedimiento: toma5.procedimiento ? {
          id: toma5.procedimiento.id,
          nombre: toma5.procedimiento.nombre,
          urlPdf: toma5.procedimiento.urlPdf,
        } : null,
        respuestas: toma5.respuestas,
        asst: toma5.asst ? {
  id: toma5.asst.id,
  foto1Url: toma5.asst.foto1Url,
  foto2Url: toma5.asst.foto2Url,
  fechaCarga: toma5.asst.fechaCarga,
} : null,

      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * APROBAR TOMA 5
 * PUT /api/toma5/:id/aprobar
 * Solo SUPERVISOR
 */
const aprobarToma5 = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Buscar el Toma 5
    const toma5 = await prisma.toma5.findUnique({
      where: { id: parseInt(id) },
      include: {
        tarea: {
          include: {
            trabajador: {
              include: {
                usuario: true,
              },
            },
          },
        },
      },
    });

    if (!toma5) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: 'Toma 5 no encontrado',
      });
    }

    // Verificar que el Toma 5 no esté ya aprobado
    if (toma5.aprobado === true) {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: 'Este Toma 5 ya está aprobado',
      });
    }

    // Verificar que la tarea existe
    if (!toma5.tarea) {
      return res.status(400).json({
        error: 'Error de datos',
        mensaje: 'Este Toma 5 no tiene una tarea asociada',
      });
    }

    // Actualizar el Toma 5
    const toma5Actualizado = await prisma.toma5.update({
      where: { id: parseInt(id) },
      data: {
        aprobado: true,
        fechaRevision: new Date(),
      },
    });

// Determinar el nuevo estado de la tarea
let nuevoEstadoTarea;
if (toma5.requiereAsst) {
  // Si requiere ASST, cambiar a PENDIENTE_ASST
  nuevoEstadoTarea = 'PENDIENTE_ASST';
} else {
  // Si NO requiere ASST, cambiar directamente a LISTA_PARA_INICIAR
  nuevoEstadoTarea = 'LISTA_PARA_INICIAR';
}


    console.log(`Actualizando tarea ${toma5.tareaId} a estado: ${nuevoEstadoTarea}`);

    // Actualizar el estado de la tarea
    const tareaActualizada = await prisma.tarea.update({
      where: { id: toma5.tareaId },
      data: {
        estado: nuevoEstadoTarea,
      },
    });

    console.log(`Tarea actualizada exitosamente. Nuevo estado: ${tareaActualizada.estado}`);

    // Emitir notificación al trabajador
    const io = req.app.get('io');
    io.to(`usuario-${toma5.tarea.trabajador.usuarioId}`).emit('toma5-aprobado', {
      mensaje: 'Tu Toma 5 ha sido aprobado',
      tareaId: toma5.tareaId,
      toma5Id: toma5.id,
      requiereAsst: toma5.requiereAsst,
      timestamp: new Date().toISOString(),
    });

    res.json({
      mensaje: 'Toma 5 aprobado exitosamente',
      toma5: {
        id: toma5Actualizado.id,
        aprobado: toma5Actualizado.aprobado,
        fechaRevision: toma5Actualizado.fechaRevision,
        requiereAsst: toma5.requiereAsst,
      },
      tarea: {
        id: toma5.tareaId,
        estadoAnterior: toma5.tarea.estado,
        nuevoEstado: nuevoEstadoTarea,
      },
    });
  } catch (error) {
    console.error('Error en aprobarToma5:', error);
    next(error);
  }
};

/**
 * RECHAZAR TOMA 5
 * PUT /api/toma5/:id/rechazar
 * Body: { observaciones }
 * Solo SUPERVISOR
 */
const rechazarToma5 = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    // Validar observaciones
    if (!observaciones || observaciones.trim().length === 0) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Se requieren las observaciones del rechazo',
      });
    }

    // Buscar el Toma 5
    const toma5 = await prisma.toma5.findUnique({
      where: { id: parseInt(id) },
      include: {
        tarea: {
          include: {
            trabajador: {
              include: {
                usuario: true,
              },
            },
          },
        },
      },
    });

    if (!toma5) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: 'Toma 5 no encontrado',
      });
    }

    // Verificar que el Toma 5 no esté ya aprobado
    if (toma5.aprobado === true) {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: 'No se puede rechazar un Toma 5 ya aprobado',
      });
    }

    // Actualizar el Toma 5
    const toma5Actualizado = await prisma.toma5.update({
      where: { id: parseInt(id) },
      data: {
        aprobado: false,
        fechaRevision: new Date(),
        observacionesSupervisor: observaciones.trim(),
      },
    });

    // Actualizar el estado de la tarea a EN_REVISION
    await prisma.tarea.update({
      where: { id: toma5.tareaId },
      data: {
        estado: 'EN_REVISION',
      },
    });

    // Emitir notificación al trabajador
    const io = req.app.get('io');
    io.to(`usuario-${toma5.tarea.trabajador.usuarioId}`).emit('toma5-rechazado', {
      mensaje: 'Tu Toma 5 ha sido rechazado. Debes rediligenciarlo',
      tareaId: toma5.tareaId,
      toma5Id: toma5.id,
      observaciones: observaciones.trim(),
      timestamp: new Date().toISOString(),
    });

    res.json({
      mensaje: 'Toma 5 rechazado exitosamente',
      toma5: {
        id: toma5Actualizado.id,
        aprobado: toma5Actualizado.aprobado,
        fechaRevision: toma5Actualizado.fechaRevision,
        observacionesSupervisor: toma5Actualizado.observacionesSupervisor,
      },
      tarea: {
        id: toma5.tareaId,
        nuevoEstado: 'EN_REVISION',
      },
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  enviarToma5,
  obtenerToma5,
  obtenerToma5PorTarea,
  aprobarToma5,
  rechazarToma5,
};
