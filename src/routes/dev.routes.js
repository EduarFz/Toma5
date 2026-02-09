const express = require('express');
const router = express.Router();
const devController = require('../controllers/dev.controller');
const { verificarToken, verificarRoles } = require('../middleware/auth.middleware');

/**
 * RUTAS DE DESARROLLO (solo para pruebas)
 * Eliminar en producción
 */

// POST /api/dev/cancelar-tareas-manual
// Solo ADMINISTRADOR o SUPERVISOR
router.post(
  '/cancelar-tareas-manual',
  verificarToken,
  verificarRoles(['ADMINISTRADOR', 'SUPERVISOR']),
  devController.ejecutarCancelacionManual
);

module.exports = router;
