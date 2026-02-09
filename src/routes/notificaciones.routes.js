const express = require('express');
const router = express.Router();
const notificacionesController = require('../controllers/notificaciones.controller');
const { verificarToken } = require('../middleware/auth.middleware');

/**
 * Todas las rutas requieren autenticación
 */

// GET /api/notificaciones - Listar notificaciones del usuario
router.get(
  '/',
  verificarToken,
  notificacionesController.listarNotificaciones
);

// PUT /api/notificaciones/:id/leer - Marcar notificación como leída
router.put(
  '/:id/leer',
  verificarToken,
  notificacionesController.marcarLeida
);

// PUT /api/notificaciones/leer-todas - Marcar todas como leídas
router.put(
  '/leer-todas',
  verificarToken,
  notificacionesController.marcarTodasLeidas
);

module.exports = router;
