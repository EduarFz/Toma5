const {
  obtenerNotificaciones,
  marcarComoLeida,
  marcarTodasComoLeidas,
} = require('../services/notificaciones.service');

/**
 * Obtener notificaciones del usuario autenticado
 * GET /api/notificaciones?limite=20&pagina=1&soloNoLeidas=false
 */
const listarNotificaciones = async (req, res, next) => {
  try {
    const usuarioId = req.usuario.id;
    const { limite = 20, pagina = 1, soloNoLeidas = false } = req.query;

    const resultado = await obtenerNotificaciones(
      usuarioId,
      parseInt(limite),
      parseInt(pagina),
      soloNoLeidas === 'true'
    );

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Marcar notificación como leída
 * PUT /api/notificaciones/:id/leer
 */
const marcarLeida = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    // Verificar que la notificación pertenezca al usuario
    const prisma = require('../config/database');
    const notificacion = await prisma.notificacion.findUnique({
      where: { id: parseInt(id) },
    });

    if (!notificacion) {
      return res.status(404).json({
        error: 'Notificación no encontrada',
        mensaje: 'No se encontró la notificación especificada',
      });
    }

    if (notificacion.usuarioId !== usuarioId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'No tienes permiso para marcar esta notificación',
      });
    }

    await marcarComoLeida(parseInt(id));

    res.json({
      mensaje: 'Notificación marcada como leída',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marcar todas las notificaciones como leídas
 * PUT /api/notificaciones/leer-todas
 */
const marcarTodasLeidas = async (req, res, next) => {
  try {
    const usuarioId = req.usuario.id;

    const resultado = await marcarTodasComoLeidas(usuarioId);

    res.json({
      mensaje: 'Todas las notificaciones han sido marcadas como leídas',
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
};
