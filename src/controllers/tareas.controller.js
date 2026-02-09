const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const { notificarTareaAsignada, notificarTareaCancelada } = require('../services/notificaciones.service');

/**
 * CREAR NUEVA TAREA
 * POST /api/tareas
 * Body: { 
 *   descripcion, 
 *   lugar (opcional),
 *   trabajadorId, (o trabajadorId1 y trabajadorId2 para 2 trabajadores)
 *   supervisorId (opcional - si lo crea el supervisor)
 * }
 */
const crearTarea = async (req, res, next) => {
  try {
    const { descripcion, lugar, trabajadorId, trabajadorId1, trabajadorId2, supervisorId } = req.body;
    const usuarioActual = req.usuario;

    // Validar descripción
    if (!descripcion || descripcion.trim().length === 0) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Se requiere la descripción de la tarea',
      });
    }

    // Determinar el supervisor
    let idSupervisor = supervisorId;
    let creadaPorTrabajador = false;

    // Si el usuario actual es supervisor, usarlo como supervisor de la tarea
    if (usuarioActual.rol === 'SUPERVISOR') {
      const supervisor = await prisma.supervisor.findUnique({
        where: { usuarioId: usuarioActual.id },
      });
      idSupervisor = supervisor.id;
      creadaPorTrabajador = false;
    }

    // Si es trabajador creando su propia tarea
    if (usuarioActual.rol === 'TRABAJADOR') {
      idSupervisor = null; // Se asignará después cuando sea necesario
      creadaPorTrabajador = true;
    }

    // Fecha de la tarea (hoy)
    const fechaTarea = new Date();
    fechaTarea.setHours(0, 0, 0, 0); // Normalizar a medianoche

    // CASO 1: Tarea para 1 solo trabajador
    if (trabajadorId) {
      // Verificar que el trabajador existe
      const trabajador = await prisma.trabajador.findUnique({
        where: { id: trabajadorId },
        include: { usuario: true },
      });

      if (!trabajador) {
        return res.status(404).json({
          error: 'No encontrado',
          mensaje: 'Trabajador no encontrado',
        });
      }

      if (!trabajador.usuario.activo) {
        return res.status(400).json({
          error: 'Usuario inactivo',
          mensaje: 'No se puede asignar tarea a un usuario inactivo',
        });
      }

      // Crear la tarea
      const tarea = await prisma.tarea.create({
        data: {
          descripcion: descripcion.trim(),
          lugar: lugar ? lugar.trim() : null,
          estado: 'PENDIENTE',
          supervisorId: idSupervisor,
          trabajadorId: trabajadorId,
          fechaTarea: fechaTarea,
          creadaPorTrabajador: creadaPorTrabajador,
        },
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
      });

           // Enviar notificación al trabajador
      const io = req.app.get('io');
      await notificarTareaAsignada(io, trabajador, tarea, supervisor);


      return res.status(201).json({
        mensaje: 'Tarea creada exitosamente',
        tarea: {
          id: tarea.id,
          descripcion: tarea.descripcion,
          lugar: tarea.lugar,
          estado: tarea.estado,
          fechaTarea: tarea.fechaTarea,
          trabajador: {
            id: tarea.trabajador.id,
            nombreCompleto: tarea.trabajador.nombreCompleto,
            cedula: tarea.trabajador.usuario.cedula,
          },
        },
      });
    }

    // CASO 2: Tarea para 2 trabajadores (tareas grupales)
    if (trabajadorId1 && trabajadorId2) {
      // Verificar que sean trabajadores diferentes
      if (trabajadorId1 === trabajadorId2) {
        return res.status(400).json({
          error: 'Datos inválidos',
          mensaje: 'No se puede asignar la misma tarea al mismo trabajador dos veces',
        });
      }

      // Verificar que ambos trabajadores existen
      const trabajador1 = await prisma.trabajador.findUnique({
        where: { id: trabajadorId1 },
        include: { usuario: true },
      });

      const trabajador2 = await prisma.trabajador.findUnique({
        where: { id: trabajadorId2 },
        include: { usuario: true },
      });

      if (!trabajador1 || !trabajador2) {
        return res.status(404).json({
          error: 'No encontrado',
          mensaje: 'Uno o ambos trabajadores no fueron encontrados',
        });
      }

      if (!trabajador1.usuario.activo || !trabajador2.usuario.activo) {
        return res.status(400).json({
          error: 'Usuario inactivo',
          mensaje: 'No se puede asignar tarea a usuarios inactivos',
        });
      }

      // Generar un ID único para el grupo de tareas
      const tareaGrupoId = `GRUPO-${Date.now()}`;

      // Crear 2 tareas vinculadas por tareaGrupoId
      const tarea1 = await prisma.tarea.create({
        data: {
          descripcion: descripcion.trim(),
          lugar: lugar ? lugar.trim() : null,
          estado: 'PENDIENTE',
          supervisorId: idSupervisor,
          trabajadorId: trabajadorId1,
          tareaGrupoId: tareaGrupoId,
          fechaTarea: fechaTarea,
          creadaPorTrabajador: creadaPorTrabajador,
        },
      });

      const tarea2 = await prisma.tarea.create({
        data: {
          descripcion: descripcion.trim(),
          lugar: lugar ? lugar.trim() : null,
          estado: 'PENDIENTE',
          supervisorId: idSupervisor,
          trabajadorId: trabajadorId2,
          tareaGrupoId: tareaGrupoId,
          fechaTarea: fechaTarea,
          creadaPorTrabajador: creadaPorTrabajador,
        },
      });

      // Emitir notificaciones a ambos trabajadores
      const io = req.app.get('io');
      io.to(`usuario-${trabajador1.usuarioId}`).emit('tarea-asignada', {
        mensaje: 'Se te ha asignado una nueva tarea (trabajo en equipo)',
        tareaId: tarea1.id,
        descripcion: tarea1.descripcion,
        timestamp: new Date().toISOString(),
      });

      io.to(`usuario-${trabajador2.usuarioId}`).emit('tarea-asignada', {
        mensaje: 'Se te ha asignado una nueva tarea (trabajo en equipo)',
        tareaId: tarea2.id,
        descripcion: tarea2.descripcion,
        timestamp: new Date().toISOString(),
      });

      return res.status(201).json({
        mensaje: 'Tareas creadas exitosamente para 2 trabajadores',
        tareas: [
          {
            id: tarea1.id,
            trabajadorId: trabajadorId1,
            nombreTrabajador: trabajador1.nombreCompleto,
          },
          {
            id: tarea2.id,
            trabajadorId: trabajadorId2,
            nombreTrabajador: trabajador2.nombreCompleto,
          },
        ],
        tareaGrupoId: tareaGrupoId,
      });
    }

    // Si no se proporcionó trabajadorId ni trabajadorId1/trabajadorId2
    return res.status(400).json({
      error: 'Datos incompletos',
      mensaje: 'Se requiere trabajadorId o trabajadorId1 y trabajadorId2',
    });
  } catch (error) {
    next(error);
  }
};


/**
 * LISTAR TAREAS
 * GET /api/tareas
 * Query params: ?fecha=2026-02-08&estado=PENDIENTE&trabajadorId=1
 */
const listarTareas = async (req, res, next) => {
  try {
    const { fecha, estado, trabajadorId, supervisorId } = req.query;
    const usuarioActual = req.usuario;

    // Construir filtros
    const filtros = {};

   // Filtro por fecha (día completo)
if (fecha) {
  const fechaInicio = new Date(fecha);
  fechaInicio.setHours(0, 0, 0, 0);
  const fechaFin = new Date(fecha);
  fechaFin.setHours(23, 59, 59, 999);

  filtros.fechaTarea = {
    gte: fechaInicio,
    lte: fechaFin,
  };
}

    if (estado) {
      filtros.estado = estado;
    }

    if (trabajadorId) {
      filtros.trabajadorId = parseInt(trabajadorId);
    }

    if (supervisorId) {
      filtros.supervisorId = parseInt(supervisorId);
    }

    // Si es trabajador, solo ver sus propias tareas
    if (usuarioActual.rol === 'TRABAJADOR') {
      const trabajador = await prisma.trabajador.findUnique({
        where: { usuarioId: usuarioActual.id },
      });
      filtros.trabajadorId = trabajador.id;
    }

    // Si es supervisor, solo ver tareas que supervisó
    if (usuarioActual.rol === 'SUPERVISOR') {
      const supervisor = await prisma.supervisor.findUnique({
        where: { usuarioId: usuarioActual.id },
      });
      filtros.supervisorId = supervisor.id;
    }

    // Buscar tareas
    const tareas = await prisma.tarea.findMany({
      where: filtros,
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
      orderBy: {
  creadaEn: 'desc',
},
    });

    // Formatear respuesta
    const tareasFormateadas = tareas.map((t) => ({
  id: t.id,
  descripcion: t.descripcion,
  lugar: t.lugar,
  estado: t.estado,
  fechaTarea: t.fechaTarea,
  creadaPorTrabajador: t.creadaPorTrabajador,
  canceladaPor: t.canceladaPor,
  creadaEn: t.creadaEn,
  actualizadaEn: t.actualizadaEn,
      tareaGrupoId: t.tareaGrupoId,
      trabajador: {
        id: t.trabajador.id,
        nombreCompleto: t.trabajador.nombreCompleto,
        cedula: t.trabajador.usuario.cedula,
        turno: t.trabajador.turno,
      },
      supervisor: t.supervisor ? {
        id: t.supervisor.id,
        nombreCompleto: t.supervisor.nombreCompleto,
        cedula: t.supervisor.usuario.cedula,
      } : null,
    }));

    res.json({
      total: tareasFormateadas.length,
      tareas: tareasFormateadas,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * OBTENER TAREA POR ID
 * GET /api/tareas/:id
 */
const obtenerTarea = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tarea = await prisma.tarea.findUnique({
      where: { id: parseInt(id) },
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
        toma5: {
          include: {
            procedimiento: true,
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

    // Formatear respuesta
    const tareaFormateada = {
  id: tarea.id,
  descripcion: tarea.descripcion,
  lugar: tarea.lugar,
  estado: tarea.estado,
  fechaTarea: tarea.fechaTarea,
  creadaPorTrabajador: tarea.creadaPorTrabajador,
  canceladaPor: tarea.canceladaPor,
  creadaEn: tarea.creadaEn,
  actualizadaEn: tarea.actualizadaEn,
      tareaGrupoId: tarea.tareaGrupoId,
      trabajador: {
        id: tarea.trabajador.id,
        nombreCompleto: tarea.trabajador.nombreCompleto,
        cedula: tarea.trabajador.usuario.cedula,
        turno: tarea.trabajador.turno,
      },
      supervisor: tarea.supervisor ? {
        id: tarea.supervisor.id,
        nombreCompleto: tarea.supervisor.nombreCompleto,
        cedula: tarea.supervisor.usuario.cedula,
      } : null,
      toma5: tarea.toma5 ? {
        id: tarea.toma5.id,
        estado: tarea.toma5.estado,
        requiereAsst: tarea.toma5.requiereAsst,
        procedimiento: tarea.toma5.procedimiento ? {
          id: tarea.toma5.procedimiento.id,
          nombre: tarea.toma5.procedimiento.nombre,
        } : null,
      } : null,
    };

    res.json({
      tarea: tareaFormateada,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CANCELAR TAREA
 * PUT /api/tareas/:id/cancelar
 * Body: { motivo }
 * Solo SUPERVISOR
 */
const cancelarTarea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    // Validar motivo
    if (!motivo || motivo.trim().length === 0) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Se requiere el motivo de la cancelación',
      });
    }

    // Buscar la tarea
    const tarea = await prisma.tarea.findUnique({
      where: { id: parseInt(id) },
      include: {
        trabajador: {
          include: {
            usuario: true,
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

    // Verificar que no esté ya cancelada
    if (tarea.estado === 'CANCELADA' || tarea.estado === 'CANCELADA_AUTOMATICAMENTE') {
      return res.status(400).json({
        error: 'Estado inválido',
        mensaje: 'La tarea ya está cancelada',
      });
    }

    // Actualizar estado
    const tareaActualizada = await prisma.tarea.update({
  where: { id: parseInt(id) },
  data: {
    estado: 'CANCELADA',
    canceladaPor: 'SUPERVISOR',
  },
});


       // Enviar notificación al trabajador
    const io = req.app.get('io');
    await notificarTareaCancelada(io, tarea.trabajador, tarea, motivo.trim());


    res.json({
      mensaje: 'Tarea cancelada exitosamente',
      tarea: {
        id: tareaActualizada.id,
        estado: tareaActualizada.estado,
        fechaCancelacion: tareaActualizada.fechaCancelacion,
        motivoCancelacion: tareaActualizada.motivoCancelacion,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearTarea,
  listarTareas,
  obtenerTarea,
  cancelarTarea,
};
