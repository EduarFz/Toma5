const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth.middleware');

/**
 * RUTAS PÚBLICAS (sin autenticación)
 */

// POST /api/auth/login - Iniciar sesión
router.post('/login', authController.login);

/**
 * RUTAS PROTEGIDAS (requieren autenticación)
 */

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', verificarToken, authController.logout);

// POST /api/auth/cambiar-contrasena - Cambiar contraseña
router.post('/cambiar-contrasena', verificarToken, authController.cambiarContrasena);

// GET /api/auth/perfil - Obtener perfil del usuario autenticado
router.get('/perfil', verificarToken, authController.obtenerPerfil);

module.exports = router;
