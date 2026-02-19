const prisma = require('../config/database');

/**
 * Enviar notificación a un usuario
 * @param {number} usuarioId - ID del usuario destinatario
 * @param {string} tipo - Tipo de notificación
 * @param {string} titulo - Título de la notificación
 * @param {string} mensaje - Mensaje de la notificación
 * @param {number} tareaId - ID de la tarea relacionada (opcional)
 * @param {object} io - Instancia de Socket.io
 */
const enviarNotificacion = async (usuarioId, tipo, titulo, mensaje, tareaId = null, io = null) => {
  try {
    // Crear notificación en base de datos
    const notificacion = await prisma.notificacion.create({
      data: {
        usuarioId,
        tipo,
        titulo,
        mensaje,
        tareaId,
        leida: false,
      },
    });

    // Emitir notificación en tiempo real si se proporciona Socket.io
    if (io) {
      io.to(`usuario-${usuarioId}`).emit('nueva-notificacion', {
        id: notificacion.id,
        tipo: notificacion.tipo,
        titulo: notificacion.titulo,
        mensaje: notificacion.mensaje,
        tareaId: notificacion.tareaId,
        leida: notificacion.leida,
        creadaEn: notificacion.creadaEn,
      });
    }

    return notificacion;
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    throw error;
  }
};

/**
 * Notificar al trabajador que se le asignó una tarea
 */
const notificarTareaAsignada = async (trabajadorId, tareaId, descripcionTarea, io) => {
  try {
    const trabajador = await prisma.trabajador.findUnique({
      where: { id: trabajadorId },
      select: { expoPushToken: true, usuario: { select: { id: true } } },
    });

    await enviarPushExpo(
    trabajador?.expoPushToken,
    'Nueva tarea asignada',
    descripcion,
    tareaId
  );

    if (!trabajador) {
      throw new Error('Trabajador no encontrado');
    }

    return await enviarNotificacion(
      trabajador.usuarioId,
      'TAREA_ASIGNADA',
      'Nueva tarea asignada',
      `Se te ha asignado la tarea: ${descripcionTarea}`,
      tareaId,
      io
    );
  } catch (error) {
    console.error('Error al notificar tarea asignada:', error);
    throw error;
  }
  

};

/**
 * Notificar cancelación de tarea
 */
const notificarTareaCancelada = async (trabajadorId, tareaId, descripcionTarea, motivo, io) => {
  try {
    const trabajador = await prisma.trabajador.findUnique({
      where: { id: trabajadorId },
     select: { expoPushToken: true, usuario: { select: { id: true } } },
  });
  await enviarPushExpo(
    trabajador?.expoPushToken,
    'Nueva tarea asignada',
    descripcion,
    tareaId
  );
    if (!trabajador) {
      throw new Error('Trabajador no encontrado');
    }

    return await enviarNotificacion(
      trabajador.usuarioId,
      'TAREA_CANCELADA',
      'Tarea cancelada',
      `La tarea "${descripcionTarea}" ha sido cancelada. Motivo: ${motivo}`,
      tareaId,
      io
    );
  } catch (error) {
    console.error('Error al notificar tarea cancelada:', error);
    throw error;
  }
};

/**
 * Obtener notificaciones de un usuario con paginación
 */
const obtenerNotificaciones = async (usuarioId, limite = 20, pagina = 1, soloNoLeidas = false) => {
  try {
    const filtros = { usuarioId };

    if (soloNoLeidas) {
      filtros.leida = false;
    }

    const skip = (pagina - 1) * limite;

    const [notificaciones, total] = await Promise.all([
      prisma.notificacion.findMany({
        where: filtros,
        orderBy: { creadaEn: 'desc' },
        take: limite,
        skip: skip,
      }),
      prisma.notificacion.count({ where: filtros }),
    ]);

    return {
      notificaciones,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
    };
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    throw error;
  }
};

/**
 * Marcar notificación como leída
 */
const marcarComoLeida = async (notificacionId) => {
  try {
    return await prisma.notificacion.update({
      where: { id: notificacionId },
      data: { 
        leida: true,
      },
    });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    throw error;
  }
};

/**
 * Marcar todas las notificaciones de un usuario como leídas
 */
const marcarTodasComoLeidas = async (usuarioId) => {
  try {
    const resultado = await prisma.notificacion.updateMany({
      where: { usuarioId, leida: false },
      data: { 
        leida: true,
      },
    });

    return {
      actualizadas: resultado.count,
    };
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    throw error;
  }
};

// Enviar notificación push a un trabajador via Expo Push API
const enviarPushExpo = async (expoPushToken, titulo, cuerpo, tareaId) => {
  if (!expoPushToken) return; // Si no tiene token registrado, omitir silenciosamente

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title: titulo,
        body: cuerpo,
        data: { tareaId }, // deep link: la app recibe esto al tocar la notificación
      }),
    });
  } catch (error) {
    console.error('Error al enviar push Expo:', error);
    // No lanzar error: si falla la push, el flujo principal no debe romperse
  }
};


module.exports = {
  enviarNotificacion,
  notificarTareaAsignada,
  notificarTareaCancelada,
  obtenerNotificaciones,
  marcarComoLeida,
  marcarTodasComoLeidas,
};
