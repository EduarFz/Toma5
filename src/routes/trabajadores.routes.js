const express = require('express');
const router = express.Router();
const trabajadoresController = require('../controllers/trabajadores.controller');
const { verificarToken, verificarRoles } = require('../middleware/auth.middleware');

/**
 * Todas las rutas requieren autenticación
 */

// GET /api/trabajadores - Listar trabajadores (con filtros opcionales)
// Solo SUPERVISOR y ADMINISTRADOR
router.get(
  '/',
  verificarToken,
  verificarRoles(['SUPERVISOR', 'ADMINISTRADOR']),
  trabajadoresController.listarTrabajadores
);

// GET /api/trabajadores/:id - Obtener trabajador por ID
router.get(
  '/:id',
  verificarToken,
  trabajadoresController.obtenerTrabajador
);

// PUT /api/trabajadores/:id/disponibilidad - Cambiar disponibilidad
// Solo SUPERVISOR
router.put(
  '/:id/disponibilidad',
  verificarToken,
  verificarRoles(['SUPERVISOR']),
  trabajadoresController.cambiarDisponibilidad
);

module.exports = router;
