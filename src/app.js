const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const prisma = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Crear aplicación Express
const app = express();
const server = http.createServer(app);

// Configurar Socket.io para notificaciones en tiempo real
const io = new Server(server, {
  cors: {
    origin: '*', // En producción, especifica los dominios permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hacer io accesible desde las rutas
app.set('io', io);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API Toma 5 - Cerrejón',
    version: '1.0.0',
    estado: 'Operativa',
  });
});

// Ruta de health check (verificar conexión a BD)
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      estado: 'OK',
      database: 'Conectada',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      estado: 'ERROR',
      database: 'Desconectada',
      error: error.message,
    });
  }
});

// ============================================
// RUTAS
// ============================================
const authRoutes = require('./routes/auth.routes');
const trabajadoresRoutes = require('./routes/trabajadores.routes');
const procedimientosRoutes = require('./routes/procedimientos.routes');
const tareasRoutes = require('./routes/tareas.routes');
const toma5Routes = require('./routes/toma5.routes');
const asstRoutes = require('./routes/asst.routes');
const devRoutes = require('./routes/dev.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de trabajadores
app.use('/api/trabajadores', trabajadoresRoutes);

// Rutas de procedimientos
app.use('/api/procedimientos', procedimientosRoutes);

// Rutas de tareas
app.use('/api/tareas', tareasRoutes);

// Rutas de Toma 5
app.use('/api/toma5', toma5Routes);

// Rutas de ASST
app.use('/api/asst', asstRoutes);

// Rutas de desarrollo (solo para pruebas)
app.use('/api/dev', devRoutes);

// Rutas de notificaciones
app.use('/api/notificaciones', notificacionesRoutes);



// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    mensaje: `No se encontró ${req.method} ${req.path}`,
  });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// ============================================
// SOCKET.IO - Manejo de conexiones en tiempo real
// ============================================
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // El cliente envía su usuarioId al conectarse
  socket.on('registrar-usuario', (usuarioId) => {
    socket.join(`usuario-${usuarioId}`);
    console.log(`Usuario ${usuarioId} registrado en Socket.io`);
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;

// ============================================
// CRON JOB - CANCELACIÓN AUTOMÁTICA
// ============================================
const { iniciarCronJob } = require('./services/cancelacionAutomatica.service');

// Iniciar el cron job de cancelación automática
iniciarCronJob(io);


server.listen(PORT, () => {
  console.log('===========================================');
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔌 Socket.io habilitado`);
  console.log(`💾 Base de datos: toma5_db`);
  console.log('===========================================');
});

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('Error no capturado:', error);
  process.exit(1);
});

module.exports = { app, io };
