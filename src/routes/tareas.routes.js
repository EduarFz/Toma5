const express = require('express');
const router = express.Router();
const tareasController = require('../controllers/tareas.controller');
const { verificarToken, verificarRoles } = require('../middleware/auth.middleware');

/**
 * Todas las rutas requieren autenticación
 */

// POST /api/tareas - Crear nueva tarea
// SUPERVISOR puede crear y asignar a trabajadores
// TRABAJADOR puede crear su propia tarea
router.post(
  '/',
  verificarToken,
  verificarRoles(['SUPERVISOR', 'TRABAJADOR']),
  tareasController.crearTarea
);

// GET /api/tareas - Listar tareas (con filtros opcionales)
// Cada usuario ve solo las tareas que le corresponden según su rol
router.get(
  '/',
  verificarToken,
  tareasController.listarTareas
);

// GET /api/tareas/:id - Obtener tarea por ID
router.get(
  '/:id',
  verificarToken,
  tareasController.obtenerTarea
);

// PUT /api/tareas/:id/cancelar - Cancelar tarea
// Solo SUPERVISOR
router.put(
  '/:id/cancelar',
  verificarToken,
  verificarRoles(['SUPERVISOR']),
  tareasController.cancelarTarea
);

module.exports = router;
