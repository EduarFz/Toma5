const cron = require('node-cron');
const prisma = require('../config/database');
const { notificarTareaCancelada } = require('./notificaciones.service');

/**
 * Cancelar automáticamente tareas PENDIENTES que pasaron su fecha
 * Se ejecuta a la medianoche de cada día
 */
const cancelarTareasPendientes = async (io) => {
  try {
    console.log('[CRON] Iniciando verificación de tareas pendientes...');

    // Obtener fecha de hoy a medianoche
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Buscar tareas PENDIENTES cuya fecha ya pasó
    const tareasPendientes = await prisma.tarea.findMany({
      where: {
        estado: 'PENDIENTE',
        fechaTarea: {
          lt: hoy, // Menor que hoy (fechas pasadas)
        },
      },
      include: {
        trabajador: {
          include: {
            usuario: true,
          },
        },
      },
    });

    console.log(`[CRON] Se encontraron ${tareasPendientes.length} tareas pendientes vencidas`);

    // Cancelar cada tarea
    let tareasActualizadas = 0;

    for (const tarea of tareasPendientes) {
      await prisma.tarea.update({
        where: { id: tarea.id },
        data: {
          estado: 'CANCELADA',
          canceladaPor: null, // NULL para cancelación automática
        },
      });

      // Notificar al trabajador
      if (tarea.trabajadorId && tarea.trabajador) {
        await notificarTareaCancelada(
          tarea.trabajadorId,
          tarea.id,
          tarea.descripcion,
          'Tarea no completada en la fecha asignada (cancelación automática)',
          io
        );
      }

      tareasActualizadas++;
    }

    console.log(`[CRON] ${tareasActualizadas} tareas canceladas automáticamente`);

    return {
      tareasEncontradas: tareasPendientes.length,
      tareasCanceladas: tareasActualizadas,
      fecha: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[CRON] Error al cancelar tareas pendientes:', error);
    throw error;
  }
};

/**
 * Iniciar el cron job que se ejecuta a medianoche
 */
const iniciarCronJob = (io) => {
  // Ejecutar a medianoche (00:00) de cada día
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Ejecutando cancelación automática de tareas...');
    await cancelarTareasPendientes(io);
  });

  console.log('✅ Cron job de cancelación automática iniciado (00:00 diario)');
};

/**
 * Función manual para pruebas (solo desarrollo)
 * Permite ejecutar la cancelación manualmente sin esperar a medianoche
 */
const cancelacionManualParaPruebas = async (io) => {
  console.log('[MANUAL] Ejecutando cancelación manual para pruebas...');
  return await cancelarTareasPendientes(io);
};

module.exports = {
  iniciarCronJob,
  cancelacionManualParaPruebas,
};
