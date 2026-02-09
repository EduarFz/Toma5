const prisma = require('../config/database');

/**
 * LISTAR PROCEDIMIENTOS
 * GET /api/procedimientos
 * Query params opcionales: ?activo=true
 * Accesible para todos los roles autenticados
 */
const listarProcedimientos = async (req, res, next) => {
  try {
    const { activo } = req.query;

    // Construir filtros
    const filtros = {};

    if (activo !== undefined) {
      filtros.activo = activo === 'true';
    }

    // Buscar procedimientos
    const procedimientos = await prisma.procedimiento.findMany({
      where: filtros,
      orderBy: {
        nombre: 'asc',
      },
    });

    res.json({
      total: procedimientos.length,
      procedimientos: procedimientos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        urlPdf: p.urlPdf,
        activo: p.activo,
        creadoEn: p.creadoEn,
      })),
    });
  } catch (error) {
    next(error);
  }
};


/**
 * OBTENER PROCEDIMIENTO POR ID
 * GET /api/procedimientos/:id
 * Accesible para todos los roles autenticados
 */
const obtenerProcedimiento = async (req, res, next) => {
  try {
    const { id } = req.params;

    const procedimiento = await prisma.procedimiento.findUnique({
      where: { id: parseInt(id) },
    });

    if (!procedimiento) {
      return res.status(404).json({
        error: 'No encontrado',
        mensaje: 'Procedimiento no encontrado',
      });
    }

    res.json({
      procedimiento: {
        id: procedimiento.id,
        nombre: procedimiento.nombre,
        descripcion: procedimiento.descripcion,
        urlPdf: procedimiento.urlPdf,
        activo: procedimiento.activo,
        creadoEn: procedimiento.creadoEn,
      },
    });
  } catch (error) {
    next(error);
  }
};


/**
 * OBTENER SOLO PROCEDIMIENTOS ACTIVOS
 * GET /api/procedimientos/activos
 * Útil para el selector del Toma 5
 */
const listarProcedimientosActivos = async (req, res, next) => {
  try {
    const procedimientos = await prisma.procedimiento.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    res.json({
      total: procedimientos.length,
      procedimientos,
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  listarProcedimientos,
  obtenerProcedimiento,
  listarProcedimientosActivos,
};
