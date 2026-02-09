const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

/**
 * Middleware para verificar token JWT
 * Valida el token y verifica que sea la sesión activa del usuario
 */
const verificarToken = async (req, res, next) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'No autorizado',
        mensaje: 'No se proporcionó token de autenticación',
      });
    }

    // El formato esperado es: "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'No autorizado',
        mensaje: 'Token inválido',
      });
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el usuario en la BD y verificar que el token sea el activo
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.usuarioId },
    });

    if (!usuario) {
      return res.status(401).json({
        error: 'No autorizado',
        mensaje: 'Usuario no encontrado',
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        error: 'Usuario inactivo',
        mensaje: 'Tu cuenta ha sido desactivada',
      });
    }

    // Verificar que el token sea el mismo que está en la BD (sesión única)
    if (usuario.sessionToken !== token) {
      return res.status(401).json({
        error: 'Sesión inválida',
        mensaje: 'Tu sesión ha sido cerrada porque iniciaste sesión en otro dispositivo',
      });
    }

    // Agregar el usuario al objeto request para que esté disponible en los controladores
    req.usuario = {
      id: usuario.id,
      cedula: usuario.cedula,
      rol: usuario.rol,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido',
        mensaje: 'El token proporcionado no es válido',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        mensaje: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente',
      });
    }

    next(error);
  }
};

/**
 * Middleware para verificar roles específicos
 * Uso: verificarRoles(['ADMINISTRADOR', 'SUPERVISOR'])
 */
const verificarRoles = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        error: 'No autorizado',
        mensaje: 'Debes estar autenticado para acceder a este recurso',
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'No tienes permisos para acceder a este recurso',
      });
    }

    next();
  };
};

module.exports = {
  verificarToken,
  verificarRoles,
};
