const express = require('express');
const router = express.Router();
const procedimientosController = require('../controllers/procedimientos.controller');
const { verificarToken } = require('../middleware/auth.middleware');

/**
 * Todas las rutas requieren autenticación
 */

// GET /api/procedimientos/activos - Listar solo procedimientos activos
// Esta ruta debe ir ANTES de /:id para que no la capture
router.get(
  '/activos',
  verificarToken,
  procedimientosController.listarProcedimientosActivos
);

// GET /api/procedimientos - Listar todos los procedimientos
router.get(
  '/',
  verificarToken,
  procedimientosController.listarProcedimientos
);

// GET /api/procedimientos/:id - Obtener procedimiento por ID
router.get(
  '/:id',
  verificarToken,
  procedimientosController.obtenerProcedimiento
);

module.exports = router;
