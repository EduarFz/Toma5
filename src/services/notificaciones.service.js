const prisma = require('../config/database');

const enviarNotificacion = async (usuarioId, tipo, titulo, mensaje, tareaId = null, io = null) => {
  try {
    const notificacion = await prisma.notificacion.create({
      data: { usuarioId, tipo, titulo, mensaje, tareaId, leida: false },
    });

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

const notificarTareaAsignada = async (trabajadorId, tareaId, descripcionTarea, io) => {
  try {
    const trabajador = await prisma.trabajador.findUnique({
      where: { id: trabajadorId },
      select: { expoPushToken: true, usuario: { select: { id: true } } },
    });

    if (!trabajador) throw new Error('Trabajador no encontrado');

    // Push silenciosa — no rompe el flujo si falla
    await enviarPushExpo(
      trabajador?.expoPushToken,
      'Nueva tarea asignada',
      descripcionTarea,   // ← nombre correcto
      tareaId
    );

    return await enviarNotificacion(
      trabajador.usuario.id,
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

const notificarTareaCancelada = async (trabajadorId, tareaId, descripcionTarea, motivo, io) => {
  try {
    const trabajador = await prisma.trabajador.findUnique({
      where: { id: trabajadorId },
      select: { expoPushToken: true, usuario: { select: { id: true } } },
    });

    if (!trabajador) throw new Error('Trabajador no encontrado');

    // Push silenciosa — no rompe el flujo si falla
    await enviarPushExpo(
      trabajador?.expoPushToken,
      'Tarea cancelada',
      descripcionTarea,   // ← nombre correcto
      tareaId
    );

    return await enviarNotificacion(
      trabajador.usuario.id,
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

const obtenerNotificaciones = async (usuarioId, limite = 20, pagina = 1, soloNoLeidas = false) => {
  try {
    const filtros = { usuarioId };
    if (soloNoLeidas) filtros.leida = false;

    const skip = (pagina - 1) * limite;

    const [notificaciones, total] = await Promise.all([
      prisma.notificacion.findMany({
        where: filtros,
        orderBy: { creadaEn: 'desc' },
        take: limite,
        skip,
      }),
      prisma.notificacion.count({ where: filtros }),
    ]);

    return { notificaciones, total, pagina, totalPaginas: Math.ceil(total / limite) };
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    throw error;
  }
};

const marcarComoLeida = async (notificacionId) => {
  try {
    return await prisma.notificacion.update({
      where: { id: notificacionId },
      data: { leida: true },
    });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    throw error;
  }
};

const marcarTodasComoLeidas = async (usuarioId) => {
  try {
    const resultado = await prisma.notificacion.updateMany({
      where: { usuarioId, leida: false },
      data: { leida: true },
    });
    return { actualizadas: resultado.count };
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    throw error;
  }
};

const enviarPushExpo = async (expoPushToken, titulo, cuerpo, tareaId) => {
  if (!expoPushToken) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title: titulo,
        body: cuerpo,
        data: { tareaId },
      }),
    });
  } catch (error) {
    console.error('Error al enviar push Expo:', error);
    // No lanzar — no debe romper el flujo principal
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
