const express = require('express');
const router = express.Router();
const asstController = require('../controllers/asst.controller');
const { verificarToken, verificarRoles } = require('../middleware/auth.middleware');

/**
 * Todas las rutas requieren autenticación
 */

// POST /api/asst - Subir ASST (2 fotos)
// Solo TRABAJADOR
router.post(
  '/',
  verificarToken,
  verificarRoles(['TRABAJADOR']),
  asstController.subirAsst
);

// GET /api/asst/tarea/:tareaId - Obtener ASST por tarea ID
router.get(
  '/tarea/:tareaId',
  verificarToken,
  asstController.obtenerAsstPorTarea
);

module.exports = router;
