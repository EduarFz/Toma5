const { cancelacionManualParaPruebas } = require('../services/cancelacionAutomatica.service');

/**
 * ENDPOINT DE PRUEBA para ejecutar cancelación manual
 * Solo para desarrollo - NO usar en producción
 */
const ejecutarCancelacionManual = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const resultado = await cancelacionManualParaPruebas(io);
    
    res.json({
      mensaje: 'Cancelación manual ejecutada',
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  ejecutarCancelacionManual,
};
