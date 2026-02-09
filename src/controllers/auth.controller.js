const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const { generarToken } = require('../utils/jwt');

/**
 * LOGIN - Iniciar sesión
 * POST /api/auth/login
 * Body: { cedula, contrasena }
 */
const login = async (req, res, next) => {
  try {
    const { cedula, contrasena } = req.body;

    // Validar que se envíen los datos
    if (!cedula || !contrasena) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Se requiere cédula y contraseña',
      });
    }

    // Buscar el usuario por cédula
    const usuario = await prisma.usuario.findUnique({
      where: { cedula: cedula.toString() },
      include: {
        supervisor: true,
        trabajador: true,
      },
    });

    // Verificar si el usuario existe
    if (!usuario) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'Usuario o contraseña incorrectos',
      });
    }

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return res.status(403).json({
        error: 'Usuario inactivo',
        mensaje: 'Tu cuenta ha sido desactivada. Contacta al administrador',
      });
    }

    // Verificar la contraseña
    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        mensaje: 'Usuario o contraseña incorrectos',
      });
    }

    // Generar nuevo session_token (para sesión de un solo dispositivo)
    const sessionToken = generarToken({ usuarioId: usuario.id, rol: usuario.rol });

    // Actualizar el session_token y ultimo_acceso en la BD
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        sessionToken,
        ultimoAcceso: new Date(),
      },
    });

    // Preparar datos del usuario según su rol
    let datosUsuario = {
      id: usuario.id,
      cedula: usuario.cedula,
      carnet: usuario.carnet,
      rol: usuario.rol,
    };

    if (usuario.rol === 'SUPERVISOR' && usuario.supervisor) {
      datosUsuario.nombreCompleto = usuario.supervisor.nombreCompleto;
      datosUsuario.departamento = usuario.supervisor.departamento;
      datosUsuario.superintendencia = usuario.supervisor.superintendencia;
      datosUsuario.uas = usuario.supervisor.uas;
    } else if (usuario.rol === 'TRABAJADOR' && usuario.trabajador) {
      datosUsuario.nombreCompleto = usuario.trabajador.nombreCompleto;
      datosUsuario.cargo = usuario.trabajador.cargo;
      datosUsuario.turno = usuario.trabajador.turno;
      datosUsuario.disponibleHoy = usuario.trabajador.disponibleHoy;
      datosUsuario.departamento = usuario.trabajador.departamento;
      datosUsuario.superintendencia = usuario.trabajador.superintendencia;
      datosUsuario.uas = usuario.trabajador.uas;
    } else if (usuario.rol === 'ADMINISTRADOR') {
      datosUsuario.nombreCompleto = 'Administrador del Sistema';
    }

    // Responder con el token y los datos del usuario
    res.json({
      mensaje: 'Inicio de sesión exitoso',
      token: sessionToken,
      usuario: datosUsuario,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * LOGOUT - Cerrar sesión
 * POST /api/auth/logout
 * Headers: Authorization: Bearer <token>
 */
const logout = async (req, res, next) => {
  try {
    const usuarioId = req.usuario.id;

    // Eliminar el session_token de la BD
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        sessionToken: null,
      },
    });

    res.json({
      mensaje: 'Sesión cerrada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CAMBIAR CONTRASEÑA
 * POST /api/auth/cambiar-contrasena
 * Headers: Authorization: Bearer <token>
 * Body: { contrasenaActual, contrasenaNueva }
 */
const cambiarContrasena = async (req, res, next) => {
  try {
    const usuarioId = req.usuario.id;
    const { contrasenaActual, contrasenaNueva } = req.body;

    // Validar datos
    if (!contrasenaActual || !contrasenaNueva) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Se requiere la contraseña actual y la nueva contraseña',
      });
    }

    // Validar longitud mínima de la nueva contraseña
    if (contrasenaNueva.length < 4) {
      return res.status(400).json({
        error: 'Contraseña inválida',
        mensaje: 'La nueva contraseña debe tener al menos 4 caracteres',
      });
    }

    // Buscar el usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    // Verificar la contraseña actual
    const contrasenaValida = await bcrypt.compare(contrasenaActual, usuario.contrasena);
    if (!contrasenaValida) {
      return res.status(401).json({
        error: 'Contraseña incorrecta',
        mensaje: 'La contraseña actual es incorrecta',
      });
    }

    // Encriptar la nueva contraseña
    const contrasenaEncriptada = await bcrypt.hash(contrasenaNueva, 10);

    // Actualizar la contraseña en la BD
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        contrasena: contrasenaEncriptada,
      },
    });

    res.json({
      mensaje: 'Contraseña actualizada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * OBTENER PERFIL DEL USUARIO AUTENTICADO
 * GET /api/auth/perfil
 * Headers: Authorization: Bearer <token>
 */
const obtenerPerfil = async (req, res, next) => {
  try {
    const usuarioId = req.usuario.id;

    // Buscar el usuario con sus relaciones
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        supervisor: true,
        trabajador: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        mensaje: 'No se encontró el usuario',
      });
    }

    // Preparar datos del usuario según su rol
    let datosUsuario = {
      id: usuario.id,
      cedula: usuario.cedula,
      carnet: usuario.carnet,
      rol: usuario.rol,
      activo: usuario.activo,
      ultimoAcceso: usuario.ultimoAcceso,
    };

    if (usuario.rol === 'SUPERVISOR' && usuario.supervisor) {
      datosUsuario.nombreCompleto = usuario.supervisor.nombreCompleto;
      datosUsuario.departamento = usuario.supervisor.departamento;
      datosUsuario.superintendencia = usuario.supervisor.superintendencia;
      datosUsuario.uas = usuario.supervisor.uas;
    } else if (usuario.rol === 'TRABAJADOR' && usuario.trabajador) {
      datosUsuario.nombreCompleto = usuario.trabajador.nombreCompleto;
      datosUsuario.cargo = usuario.trabajador.cargo;
      datosUsuario.turno = usuario.trabajador.turno;
      datosUsuario.disponibleHoy = usuario.trabajador.disponibleHoy;
      datosUsuario.departamento = usuario.trabajador.departamento;
      datosUsuario.superintendencia = usuario.trabajador.superintendencia;
      datosUsuario.uas = usuario.trabajador.uas;
    } else if (usuario.rol === 'ADMINISTRADOR') {
      datosUsuario.nombreCompleto = 'Administrador del Sistema';
    }

    res.json({
      usuario: datosUsuario,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  cambiarContrasena,
  obtenerPerfil,
};
