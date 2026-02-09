const express = require('express');
const router = express.Router();
const toma5Controller = require('../controllers/toma5.controller');
const { verificarToken, verificarRoles } = require('../middleware/auth.middleware');

/**
 * Todas las rutas requieren autenticación
 */

// POST /api/toma5 - Enviar Toma 5
// Solo TRABAJADOR
router.post(
  '/',
  verificarToken,
  verificarRoles(['TRABAJADOR']),
  toma5Controller.enviarToma5
);

// GET /api/toma5/tarea/:tareaId - Obtener Toma 5 por tarea ID
// Esta ruta debe ir ANTES de /:id para que no la capture
router.get(
  '/tarea/:tareaId',
  verificarToken,
  toma5Controller.obtenerToma5PorTarea
);

// GET /api/toma5/:id - Obtener Toma 5 por ID
router.get(
  '/:id',
  verificarToken,
  toma5Controller.obtenerToma5
);

// PUT /api/toma5/:id/aprobar - Aprobar Toma 5
// Solo SUPERVISOR
router.put(
  '/:id/aprobar',
  verificarToken,
  verificarRoles(['SUPERVISOR']),
  toma5Controller.aprobarToma5
);

// PUT /api/toma5/:id/rechazar - Rechazar Toma 5
// Solo SUPERVISOR
router.put(
  '/:id/rechazar',
  verificarToken,
  verificarRoles(['SUPERVISOR']),
  toma5Controller.rechazarToma5
);

module.exports = router;
