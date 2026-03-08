const prisma = require('../config/database');
const { subirPdf, eliminarArchivo } = require('../config/cloudinary');

// LISTAR PROCEDIMIENTOS
// GET /api/procedimientos
// Query params opcionales: ?activo=true
const listarProcedimientos = async (req, res, next) => {
  try {
    const { activo } = req.query;
    const filtros = {};
    if (activo !== undefined) filtros.activo = activo === 'true';

    const procedimientos = await prisma.procedimiento.findMany({
      where: filtros,
      orderBy: { nombre: 'asc' },
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

// OBTENER PROCEDIMIENTO POR ID
// GET /api/procedimientos/:id
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

// OBTENER SOLO PROCEDIMIENTOS ACTIVOS
// GET /api/procedimientos/activos
const listarProcedimientosActivos = async (req, res, next) => {
  try {
    const procedimientos = await prisma.procedimiento.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, descripcion: true },
      orderBy: { nombre: 'asc' },
    });

    res.json({ total: procedimientos.length, procedimientos });
  } catch (error) {
    next(error);
  }
};

// CREAR PROCEDIMIENTO CON PDF
// POST /api/procedimientos
// Body: { nombre, descripcion (opcional), pdfBase64, nombreArchivo }
// Solo ADMINISTRADOR
const crearProcedimiento = async (req, res, next) => {
  try {
    const usuarioActual = req.usuario;
    if (usuarioActual.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'Solo el administrador puede crear procedimientos',
      });
    }

    const { nombre, descripcion, pdfBase64, nombreArchivo } = req.body;

    if (!nombre || !pdfBase64 || !nombreArchivo) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Se requiere nombre, pdfBase64 y nombreArchivo',
      });
    }

    if (!pdfBase64.startsWith('data:application/pdf;base64,')) {
      return res.status(400).json({
        error: 'Formato inválido',
        mensaje: 'El PDF debe estar en formato base64 (data:application/pdf;base64,...)',
      });
    }

    // Subir PDF a Cloudinary
    const resultado = await subirPdf(pdfBase64, nombreArchivo);

    // Crear registro en BD
    const procedimiento = await prisma.procedimiento.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        urlPdf: resultado.url,
        activo: true,
      },
    });

    res.status(201).json({
      mensaje: 'Procedimiento creado exitosamente',
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

// ACTIVAR / DESACTIVAR PROCEDIMIENTO
// PATCH /api/procedimientos/:id/estado
// Body: { activo: true | false }
// Solo ADMINISTRADOR
const cambiarEstadoProcedimiento = async (req, res, next) => {
  try {
    const usuarioActual = req.usuario;
    if (usuarioActual.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'Solo el administrador puede modificar procedimientos',
      });
    }

    const { id } = req.params;
    const { activo } = req.body;

    if (activo === undefined) {
      return res.status(400).json({
        error: 'Datos incompletos',
        mensaje: 'Se requiere el campo activo (true o false)',
      });
    }

    const procedimiento = await prisma.procedimiento.update({
      where: { id: parseInt(id) },
      data: { activo: Boolean(activo) },
    });

    res.json({
      mensaje: `Procedimiento ${activo ? 'activado' : 'desactivado'} exitosamente`,
      procedimiento: {
        id: procedimiento.id,
        nombre: procedimiento.nombre,
        activo: procedimiento.activo,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listarProcedimientos,
  obtenerProcedimiento,
  listarProcedimientosActivos,
  crearProcedimiento,
  cambiarEstadoProcedimiento,
};
