const prisma = require('../config/database');

/**
 * SERVICIO CENTRALIZADO DE NOTIFICACIONES
 * Gestiona el envío de notificaciones en tiempo real y su persistencia
 */

/**
 * Tipos de notificaciones soportados
 */
const TIPOS_NOTIFICACION = {
  TAREA_ASIGNADA: 'TAREA_ASIGNADA',
  TAREA_CANCELADA: 'TAREA_CANCELADA',
  TOMA5_ENVIADO: 'TOMA5_ENVIADO',
  TOMA5_APROBADO: 'TOMA5_APROBADO',
  TOMA5_RECHAZADO: 'TOMA5_RECHAZADO',
  ASST_COMPLETADO: 'ASST_COMPLETADO',
  DISPONIBILIDAD_CAMBIADA: 'DISPONIBILIDAD_CAMBIADA',
  CANCELACION_AUTOMATICA: 'CANCELACION_AUTOMATICA',
};

/**
 * Enviar notificación a un usuario específico
 * @param {Object} io - Instancia de Socket.io
 * @param {Number} usuarioId - ID del usuario destinatario
 * @param {String} tipo - Tipo de notificación (usar TIPOS_NOTIFICACION)
 * @param {String} titulo - Título de la notificación
 * @param {String} mensaje - Mensaje de la notificación
 * @param {Object} datos - Datos adicionales (opcional)
 * @param {Boolean} persistir - Si debe guardarse en la BD (default: true)
 */
const enviarNotificacion = async (io, usuarioId, tipo, titulo, mensaje, datos = {}, persistir = true) => {
  try {
    // Preparar el payload de la notificación
    const notificacion = {
      tipo,
      titulo,
      mensaje,
      datos,
      timestamp: new Date().toISOString(),
    };

    // Emitir notificación en tiempo real via Socket.io
    if (io) {
      io.to(`usuario-${usuarioId}`).emit('notificacion', notificacion);
      console.log(`📢 [NOTIF] Enviada a usuario ${usuarioId}: ${tipo}`);
    }

    // Persistir en base de datos si está habilitado
    if (persistir) {
      await prisma.notificacion.create({
        data: {
          usuarioId,
          tipo,
          titulo,
          mensaje,
          datos: JSON.stringify(datos),
          leido: false,
        },
      });
      console.log(`💾 [NOTIF] Persistida en BD para usuario ${usuarioId}`);
    }

    return notificacion;
  } catch (error) {
    console.error('❌ [NOTIF] Error enviando notificación:', error);
    throw error;
  }
};

/**
 * Enviar notificación a múltiples usuarios
 * @param {Object} io - Instancia de Socket.io
 * @param {Array} usuariosIds - Array de IDs de usuarios
 * @param {String} tipo - Tipo de notificación
 * @param {String} titulo - Título
 * @param {String} mensaje - Mensaje
 * @param {Object} datos - Datos adicionales
 * @param {Boolean} persistir - Si debe guardarse en la BD
 */
const enviarNotificacionMultiple = async (io, usuariosIds, tipo, titulo, mensaje, datos = {}, persistir = true) => {
  try {
    const promesas = usuariosIds.map(usuarioId =>
      enviarNotificacion(io, usuarioId, tipo, titulo, mensaje, datos, persistir)
    );
    
    await Promise.all(promesas);
    console.log(`📢 [NOTIF] Enviada a ${usuariosIds.length} usuarios: ${tipo}`);
    
    return { enviadas: usuariosIds.length };
  } catch (error) {
    console.error('❌ [NOTIF] Error enviando notificaciones múltiples:', error);
    throw error;
  }
};

/**
 * Enviar notificación broadcast (a todos los usuarios conectados)
 * @param {Object} io - Instancia de Socket.io
 * @param {String} tipo - Tipo de notificación
 * @param {String} titulo - Título
 * @param {String} mensaje - Mensaje
 * @param {Object} datos - Datos adicionales
 */
const enviarNotificacionBroadcast = (io, tipo, titulo, mensaje, datos = {}) => {
  try {
    const notificacion = {
      tipo,
      titulo,
      mensaje,
      datos,
      timestamp: new Date().toISOString(),
    };

    if (io) {
      io.emit('notificacion-broadcast', notificacion);
      console.log(`📣 [NOTIF] Broadcast enviado: ${tipo}`);
    }

    return notificacion;
  } catch (error) {
    console.error('❌ [NOTIF] Error enviando broadcast:', error);
    throw error;
  }
};

/**
 * Marcar notificación como leída
 * @param {Number} notificacionId - ID de la notificación
 */
const marcarComoLeida = async (notificacionId) => {
  try {
    await prisma.notificacion.update({
      where: { id: notificacionId },
      data: { 
        leido: true,
        fechaLeido: new Date(),
      },
    });
    console.log(`✅ [NOTIF] Notificación ${notificacionId} marcada como leída`);
  } catch (error) {
    console.error('❌ [NOTIF] Error marcando notificación como leída:', error);
    throw error;
  }
};

/**
 * Marcar todas las notificaciones de un usuario como leídas
 * @param {Number} usuarioId - ID del usuario
 */
const marcarTodasComoLeidas = async (usuarioId) => {
  try {
    const resultado = await prisma.notificacion.updateMany({
      where: { 
        usuarioId,
        leido: false,
      },
      data: { 
        leido: true,
        fechaLeido: new Date(),
      },
    });
    console.log(`✅ [NOTIF] ${resultado.count} notificaciones marcadas como leídas para usuario ${usuarioId}`);
    return { marcadas: resultado.count };
  } catch (error) {
    console.error('❌ [NOTIF] Error marcando todas como leídas:', error);
    throw error;
  }
};

/**
 * Obtener notificaciones de un usuario (con paginación)
 * @param {Number} usuarioId - ID del usuario
 * @param {Number} limite - Cantidad máxima de notificaciones (default: 20)
 * @param {Number} pagina - Número de página (default: 1)
 * @param {Boolean} soloNoLeidas - Filtrar solo no leídas (default: false)
 */
const obtenerNotificaciones = async (usuarioId, limite = 20, pagina = 1, soloNoLeidas = false) => {
  try {
    const where = {
      usuarioId,
      ...(soloNoLeidas && { leido: false }),
    };

    const [notificaciones, total] = await Promise.all([
      prisma.notificacion.findMany({
        where,
        orderBy: { fechaCreacion: 'desc' },
        take: limite,
        skip: (pagina - 1) * limite,
      }),
      prisma.notificacion.count({ where }),
    ]);

    return {
      notificaciones,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
      noLeidas: await prisma.notificacion.count({
        where: { usuarioId, leido: false },
      }),
    };
  } catch (error) {
    console.error('❌ [NOTIF] Error obteniendo notificaciones:', error);
    throw error;
  }
};

/**
 * Eliminar notificaciones antiguas (más de 30 días)
 * Útil para mantener la BD limpia
 */
const limpiarNotificacionesAntiguas = async () => {
  try {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const resultado = await prisma.notificacion.deleteMany({
      where: {
        fechaCreacion: {
          lt: hace30Dias,
        },
        leido: true, // Solo eliminar las leídas
      },
    });

    console.log(`🧹 [NOTIF] ${resultado.count} notificaciones antiguas eliminadas`);
    return { eliminadas: resultado.count };
  } catch (error) {
    console.error('❌ [NOTIF] Error limpiando notificaciones antiguas:', error);
    throw error;
  }
};

// ============================================
// FUNCIONES ESPECÍFICAS POR TIPO DE EVENTO
// ============================================

/**
 * Notificación: Tarea asignada a trabajador
 */
const notificarTareaAsignada = async (io, trabajador, tarea, supervisor) => {
  return await enviarNotificacion(
    io,
    trabajador.usuarioId,
    TIPOS_NOTIFICACION.TAREA_ASIGNADA,
    '📋 Nueva tarea asignada',
    `${supervisor.nombreCompleto} te ha asignado una nueva tarea: ${tarea.descripcion}`,
    {
      tareaId: tarea.id,
      supervisorId: supervisor.id,
      descripcion: tarea.descripcion,
    }
  );
};

/**
 * Notificación: Tarea cancelada por supervisor
 */
const notificarTareaCancelada = async (io, trabajador, tarea, motivo) => {
  return await enviarNotificacion(
    io,
    trabajador.usuarioId,
    TIPOS_NOTIFICACION.TAREA_CANCELADA,
    '❌ Tarea cancelada',
    `Una de tus tareas ha sido cancelada. Motivo: ${motivo}`,
    {
      tareaId: tarea.id,
      motivo,
    }
  );
};

/**
 * Notificación: Toma 5 enviado por trabajador
 */
const notificarToma5Enviado = async (io, supervisor, toma5, trabajador) => {
  return await enviarNotificacion(
    io,
    supervisor.usuarioId,
    TIPOS_NOTIFICACION.TOMA5_ENVIADO,
    '📝 Toma 5 recibido',
    `${trabajador.nombreCompleto} ha enviado un Toma 5 para revisión`,
    {
      toma5Id: toma5.id,
      tareaId: toma5.tareaId,
      trabajadorId: trabajador.id,
      requiereAsst: toma5.requiereAsst,
    }
  );
};

/**
 * Notificación: Toma 5 aprobado por supervisor
 */
const notificarToma5Aprobado = async (io, trabajador, toma5, requiereAsst) => {
  const mensaje = requiereAsst
    ? 'Tu Toma 5 ha sido aprobado. Ahora debes completar el ASST antes de iniciar la tarea'
    : 'Tu Toma 5 ha sido aprobado. La tarea está lista para iniciar';

  return await enviarNotificacion(
    io,
    trabajador.usuarioId,
    TIPOS_NOTIFICACION.TOMA5_APROBADO,
    '✅ Toma 5 aprobado',
    mensaje,
    {
      toma5Id: toma5.id,
      tareaId: toma5.tareaId,
      requiereAsst,
    }
  );
};

/**
 * Notificación: Toma 5 rechazado por supervisor
 */
const notificarToma5Rechazado = async (io, trabajador, toma5, motivoRechazo) => {
  return await enviarNotificacion(
    io,
    trabajador.usuarioId,
    TIPOS_NOTIFICACION.TOMA5_RECHAZADO,
    '⚠️ Toma 5 rechazado',
    `Tu Toma 5 ha sido rechazado. Motivo: ${motivoRechazo}`,
    {
      toma5Id: toma5.id,
      tareaId: toma5.tareaId,
      motivoRechazo,
    }
  );
};

/**
 * Notificación: ASST completado por trabajador
 */
const notificarASSTCompletado = async (io, supervisor, asst, trabajador) => {
  return await enviarNotificacion(
    io,
    supervisor.usuarioId,
    TIPOS_NOTIFICACION.ASST_COMPLETADO,
    '📷 ASST completado',
    `${trabajador.nombreCompleto} ha completado el ASST. La tarea está lista para iniciar`,
    {
      asstId: asst.id,
      tareaId: asst.tareaId,
      trabajadorId: trabajador.id,
    }
  );
};

/**
 * Notificación: Disponibilidad cambiada
 */
const notificarDisponibilidadCambiada = async (io, trabajador, disponible) => {
  const estado = disponible ? 'disponible' : 'no disponible';
  return await enviarNotificacion(
    io,
    trabajador.usuarioId,
    TIPOS_NOTIFICACION.DISPONIBILIDAD_CAMBIADA,
    '🔄 Disponibilidad actualizada',
    `Tu disponibilidad ha sido actualizada a: ${estado}`,
    {
      trabajadorId: trabajador.id,
      disponible,
    }
  );
};

module.exports = {
  TIPOS_NOTIFICACION,
  enviarNotificacion,
  enviarNotificacionMultiple,
  enviarNotificacionBroadcast,
  marcarComoLeida,
  marcarTodasComoLeidas,
  obtenerNotificaciones,
  limpiarNotificacionesAntiguas,
  // Funciones específicas
  notificarTareaAsignada,
  notificarTareaCancelada,
  notificarToma5Enviado,
  notificarToma5Aprobado,
  notificarToma5Rechazado,
  notificarASSTCompletado,
  notificarDisponibilidadCambiada,
};
