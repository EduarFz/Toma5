const cron = require('node-cron');
const prisma = require('../config/database');

/**
 * SERVICIO DE CANCELACIÓN AUTOMÁTICA DE TAREAS
 * Cancela automáticamente todas las tareas PENDIENTES a las 00:00 GMT-5
 */

let cronJobActivo = null;

/**
 * Función que ejecuta la cancelación automática
 */
const ejecutarCancelacionAutomatica = async () => {
  try {
    console.log('\n🕐 [CRON] Ejecutando cancelación automática de tareas...');
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);

    // Buscar todas las tareas en estado PENDIENTE
    const tareasPendientes = await prisma.tarea.findMany({
      where: {
        estado: 'PENDIENTE',
      },
      include: {
        trabajador: {
          include: {
            usuario: true,
          },
        },
        supervisor: true,
      },
    });

    if (tareasPendientes.length === 0) {
      console.log('✅ [CRON] No hay tareas pendientes para cancelar');
      return { canceladas: 0, mensaje: 'No hay tareas pendientes' };
    }

    console.log(`📋 [CRON] Se encontraron ${tareasPendientes.length} tareas pendientes`);

    // Actualizar todas las tareas pendientes a CANCELADA
    const resultado = await prisma.tarea.updateMany({
      where: {
        estado: 'PENDIENTE',
      },
      data: {
        estado: 'CANCELADA',
        fechaCancelacion: new Date(),
        motivoCancelacion: 'Cancelación automática por fin del día sin completar',
      },
    });

    console.log(`✅ [CRON] ${resultado.count} tareas canceladas automáticamente`);

    // Registrar en base de datos las notificaciones para cada trabajador
    // (opcional: podrías guardar un log de estas cancelaciones)
    
    return {
      canceladas: resultado.count,
      mensaje: `${resultado.count} tareas canceladas exitosamente`,
      tareas: tareasPendientes.map(t => ({
        id: t.id,
        trabajador: t.trabajador.nombreCompleto,
        descripcion: t.descripcion,
      })),
    };

  } catch (error) {
    console.error('❌ [CRON] Error en cancelación automática:', error);
    throw error;
  }
};

/**
 * Iniciar el cron job
 * Se ejecuta todos los días a las 00:00 GMT-5 (medianoche hora Colombia)
 * Formato: segundo minuto hora día mes día-semana
 * '0 0 0 * * *' = todos los días a las 00:00:00
 */
const iniciarCronJob = (io) => {
  if (cronJobActivo) {
    console.log('⚠️  [CRON] El cron job ya está activo');
    return;
  }

  // Programar ejecución diaria a las 00:00 GMT-5
  cronJobActivo = cron.schedule(
    '0 0 0 * * *',
    async () => {
      try {
        const resultado = await ejecutarCancelacionAutomatica();
        
        // Emitir notificación a través de Socket.io si hay tareas canceladas
        if (resultado.canceladas > 0 && io) {
          io.emit('cancelacion-automatica', {
            mensaje: `${resultado.canceladas} tareas fueron canceladas automáticamente`,
            cantidad: resultado.canceladas,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('❌ [CRON] Error ejecutando cron job:', error);
      }
    },
    {
      scheduled: true,
      timezone: 'America/Bogota', // GMT-5 (hora Colombia)
    }
  );

  console.log('✅ [CRON] Cron job de cancelación automática iniciado');
  console.log('⏰ [CRON] Se ejecutará todos los días a las 00:00 GMT-5');
};

/**
 * Detener el cron job
 */
const detenerCronJob = () => {
  if (cronJobActivo) {
    cronJobActivo.stop();
    cronJobActivo = null;
    console.log('🛑 [CRON] Cron job detenido');
  }
};

/**
 * FUNCIÓN MANUAL para probar la cancelación (útil para desarrollo)
 * NO se ejecuta automáticamente, solo para pruebas
 */
const cancelacionManualParaPruebas = async (io) => {
  console.log('🧪 [PRUEBA] Ejecutando cancelación manual...');
  const resultado = await ejecutarCancelacionAutomatica();
  
  if (resultado.canceladas > 0 && io) {
    io.emit('cancelacion-automatica', {
      mensaje: `${resultado.canceladas} tareas canceladas (prueba manual)`,
      cantidad: resultado.canceladas,
      timestamp: new Date().toISOString(),
    });
  }
  
  return resultado;
};

module.exports = {
  iniciarCronJob,
  detenerCronJob,
  cancelacionManualParaPruebas,
  ejecutarCancelacionAutomatica,
};
