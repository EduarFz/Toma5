const express = require('express');
const router = express.Router();
const { ejecutarCancelacionManual } = require('../controllers/dev.controller');
const { verificarToken } = require('../middleware/auth.middleware');

/**
 * RUTA DE DESARROLLO - Cancelación manual de tareas
 * POST /api/dev/cancelar-tareas
 * Solo para pruebas - ejecuta el cron job manualmente
 */
router.post('/cancelar-tareas', verificarToken, ejecutarCancelacionManual);

module.exports = router;
