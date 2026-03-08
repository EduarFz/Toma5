const express = require('express');
const router = express.Router();
const {
  listarProcedimientos,
  obtenerProcedimiento,
  listarProcedimientosActivos,
  crearProcedimiento,
  cambiarEstadoProcedimiento,
} = require('../controllers/procedimientos.controller');
const { verificarToken } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/procedimientos/activos  ← debe ir ANTES de /:id
router.get('/activos', listarProcedimientosActivos);

// GET /api/procedimientos
router.get('/', listarProcedimientos);

// GET /api/procedimientos/:id
router.get('/:id', obtenerProcedimiento);

// POST /api/procedimientos  (solo ADMINISTRADOR)
router.post('/', crearProcedimiento);

// PATCH /api/procedimientos/:id/estado  (solo ADMINISTRADOR)
router.patch('/:id/estado', cambiarEstadoProcedimiento);

module.exports = router;
