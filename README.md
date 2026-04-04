# Toma 5 — Backend

API REST del sistema digitalizado del formulario Toma 5 · UAS Equipos de Vías, Cerrejón.

## Stack

| Tecnología | Versión |
|---|---|
| Node.js | v18+ |
| Express | 5.x |
| PostgreSQL | 15+ |
| Prisma ORM | 5.22 |
| Socket.io | 4.8 |
| JWT | 365 días de sesión |
| Cloudinary | Fotos ASST y PDFs |

## Prerrequisitos

- Node.js instalado
- PostgreSQL corriendo localmente con la base de datos `toma5db`

## Instalación

```bash
git clone https://github.com/EduarFz/Toma5
cd toma5-backend
npm install
```

## Variables de entorno

Crea el archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://postgres:113322@localhost:5432/toma5db?schema=public"
JWT_SECRET=toma5cerrejonsecretkey2026
PORT=3000
CLOUDINARY_CLOUD_NAME=<tu-cloud-name>
CLOUDINARY_API_KEY=<tu-api-key>
CLOUDINARY_API_SECRET=<tu-api-secret>
```

> Si no usas Cloudinary localmente, define igualmente esas variables con cualquier valor para que el servidor arranque sin errores.

## Base de datos

```bash
# 1. Generar el cliente Prisma
npx prisma generate

# 2. Crear las tablas (aplicar migración)
npx prisma migrate deploy

# 3. Poblar con usuarios reales de prueba
node seed-usuarios.js
```

## Ejecutar el servidor

```bash
# Desarrollo (reinicio automático con nodemon)
npm run dev

# Producción
npm start
```

Servidor disponible en: **http://localhost:3000**  
Health check: http://localhost:3000/health

## Credenciales de prueba

| Rol | Cédula | Contraseña |
|---|---|---|
| Supervisor | `1098765432` | `nueva123` |
| Trabajador (Eduardo F.) | `1122407658` | `94276` (carnet) |
| Administrador | `000000000` | `admin123` |

> La contraseña inicial de cada trabajador es su número de carnet.

## Scripts de utilidad

```bash
node reset-contrasena.js         # Resetea contraseñas de todos al carnet
node crear-admin.js              # Crea el usuario administrador
node limpiar-procedimientos.js   # Elimina procedimientos duplicados en BD
node seed-usuarios.js            # Crea usuarios supervisores y trabajadores
```
