const prisma = require('../config/database');

/**
 * LISTAR TRABAJADORES
 * GET /api/trabajadores
 * Query params opcionales: ?turno=CARDENALES&disponible=true
 * Solo accesible para SUPERVISOR y ADMINISTRADOR
 */
const listarTrabajadores = async (req, res, next) => {
  try {
    const { turno, disponible } = req.query;

    // Construir filtros dinámicos
    const filtros = {};

    if (turno) {
      filtros.turno = turno.toUpperCase();
    }

    if (disponible !== undefined) {
      filtros.disponibleHoy = disponible === 'true';
    }

    // Buscar trabajadores
    const trabajadores = await prisma.trabajador.findMany({
      where: filtros,
      include: {
        usuario: {
          select: {
            cedula: true,
            carnet: true,
            activo: true,
          },
        },
      },
      orderBy: [
        { turno: 'asc' },
        { nombreCompleto: 'asc' },
      ],
    });

    // Formatear respuesta
    const trabajadoresFormateados = trabajadores.map((t) => ({
      id: t.id,
      usuarioId: t.usuarioId,
      cedula: t.usuario.cedula,
      carnet: t.usuario.carnet,
      nombreCompleto: t.nombreCompleto,
      cargo: t.cargo,
      turno: t.turno,
      disponibleHoy: t.disponibleHoy,
      activo: t.usuario.activo,
      departamento: t.departamento,
      superintendencia: t.superintendencia,
      uas: t.uas,
    }));

    res.json({
      total: trabajadoresFormateados.length,
      trabajadores: trabajadoresFormateados,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * OBTENER TRABAJADOR POR ID
 * GET /api/trabajadores/:id
 */
const obtenerTrabajador = async (req, res, next) => {
  try {
    const { id } = req.params;

    const trabajador = await prisma.trabajador.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuario: {
          select: {
            cedula: true,
            carnet: true,
            activo: true,
            ultimoAcceso: true,
          },
        },
      },
    });

    if (!trabajador) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: 'Trabajador no encontrado',
      });
    }

    // Formatear respuesta
    const trabajadorFormateado = {
      id: trabajador.id,
      usuarioId: trabajador.usuarioId,
      cedula: trabajador.usuario.cedula,
      carnet: trabajador.usuario.carnet,
      nombreCompleto: trabajador.nombreCompleto,
      cargo: trabajador.cargo,
      turno: trabajador.turno,
      disponibleHoy: trabajador.disponibleHoy,
      activo: trabajador.usuario.activo,
      departamento: trabajador.departamento,
      superintendencia: trabajador.superintendencia,
      uas: trabajador.uas,
      ultimoAcceso: trabajador.usuario.ultimoAcceso,
    };

    res.json({
      trabajador: trabajadorFormateado,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CAMBIAR DISPONIBILIDAD DE TRABAJADOR
 * PUT /api/trabajadores/:id/disponibilidad
 * Body: { disponible: true/false }
 * Solo SUPERVISOR puede ejecutar esta acción
 */
const cambiarDisponibilidad = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { disponible } = req.body;

    // Validar que se envíe el parámetro
    if (disponible === undefined) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Se requiere el campo "disponible" (true o false)',
      });
    }

    // Validar que sea booleano
    if (typeof disponible !== 'boolean') {
      return res.status(400).json({
        error: 'Datos inválidos',
        mensaje: 'El campo "disponible" debe ser true o false',
      });
    }

    // Buscar el trabajador
    const trabajador = await prisma.trabajador.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuario: {
          select: {
            id: true,
            cedula: true,
            activo: true,
          },
        },
      },
    });

    if (!trabajador) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: 'Trabajador no encontrado',
      });
    }

    // Verificar que el usuario esté activo
    if (!trabajador.usuario.activo) {
      return res.status(400).json({
        error: 'Usuario inactivo',
        mensaje: 'No se puede cambiar la disponibilidad de un usuario inactivo',
      });
    }

    // Actualizar disponibilidad
    const trabajadorActualizado = await prisma.trabajador.update({
      where: { id: parseInt(id) },
      data: {
        disponibleHoy: disponible,
      },
    });

    // Emitir notificación en tiempo real si se cambió a NO DISPONIBLE
    // Según requerimientos: solo notificar cuando cambia de DISPONIBLE a NO DISPONIBLE
    if (!disponible && trabajador.disponibleHoy) {
      const io = req.app.get('io');
      io.to(`usuario-${trabajador.usuario.id}`).emit('disponibilidad-cambiada', {
        mensaje: 'Tu disponibilidad ha sido cambiada a NO DISPONIBLE',
        disponible: false,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      mensaje: 'Disponibilidad actualizada exitosamente',
      trabajador: {
        id: trabajadorActualizado.id,
        nombreCompleto: trabajadorActualizado.nombreCompleto,
        disponibleHoy: trabajadorActualizado.disponibleHoy,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listarTrabajadores,
  obtenerTrabajador,
  cambiarDisponibilidad,
};
