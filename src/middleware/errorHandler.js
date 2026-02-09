/**
 * Middleware centralizado para manejo de errores
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error capturado:', err);

  // Error de Prisma
  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json({
      error: 'Error de base de datos',
      mensaje: 'Ocurrió un error al procesar la solicitud',
      codigo: err.code,
    });
  }

  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      mensaje: err.message,
    });
  }

  // Error genérico
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    mensaje: err.mensaje || 'Ocurrió un error inesperado',
  });
};

module.exports = errorHandler;
