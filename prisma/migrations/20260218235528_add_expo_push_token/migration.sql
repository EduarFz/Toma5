-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "cedula" VARCHAR(20) NOT NULL,
    "carnet" VARCHAR(10) NOT NULL,
    "contrasena" VARCHAR(255) NOT NULL,
    "rol" VARCHAR(20) NOT NULL,
    "activo" BOOLEAN DEFAULT true,
    "session_token" VARCHAR(255),
    "ultimo_acceso" TIMESTAMP(6),
    "creado_en" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisores" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "nombre_completo" VARCHAR(100) NOT NULL,
    "departamento" VARCHAR(100) DEFAULT 'Manejo de Carbón',
    "superintendencia" VARCHAR(100) DEFAULT 'Ferrocarril',
    "uas" VARCHAR(100) DEFAULT 'Equipos de Vías',
    "creado_en" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervisores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trabajadores" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "nombre_completo" VARCHAR(100) NOT NULL,
    "cargo" VARCHAR(50) DEFAULT 'Técnico Operador',
    "turno" VARCHAR(20) NOT NULL,
    "disponible_hoy" BOOLEAN DEFAULT true,
    "departamento" VARCHAR(100) DEFAULT 'Manejo de Carbón',
    "superintendencia" VARCHAR(100) DEFAULT 'Ferrocarril',
    "uas" VARCHAR(100) DEFAULT 'Equipos de Vías',
    "expopushtoken" VARCHAR(500),
    "creado_en" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trabajadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedimientos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "url_pdf" VARCHAR(500) NOT NULL,
    "activo" BOOLEAN DEFAULT true,
    "creado_en" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas" (
    "id" SERIAL NOT NULL,
    "tarea_grupo_id" VARCHAR(50),
    "descripcion" VARCHAR(200) NOT NULL,
    "lugar" VARCHAR(100),
    "trabajador_id" INTEGER,
    "supervisor_id" INTEGER,
    "creada_por_trabajador" BOOLEAN DEFAULT false,
    "fecha_tarea" DATE NOT NULL,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    "cancelada_por" VARCHAR(20),
    "creada_en" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "actualizada_en" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toma5" (
    "id" SERIAL NOT NULL,
    "tarea_id" INTEGER,
    "trabajador_id" INTEGER,
    "fecha_diligenciamiento" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "procedimiento_id" INTEGER,
    "requiere_asst" BOOLEAN DEFAULT false,
    "peligros_adicionales" TEXT,
    "comentarios" TEXT,
    "aprobado" BOOLEAN,
    "fecha_revision" TIMESTAMP(6),
    "observaciones_supervisor" TEXT,

    CONSTRAINT "toma5_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toma5_respuestas" (
    "id" SERIAL NOT NULL,
    "toma5_id" INTEGER,
    "paso" INTEGER NOT NULL,
    "pregunta" VARCHAR(10) NOT NULL,
    "respuesta" BOOLEAN NOT NULL,

    CONSTRAINT "toma5_respuestas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asst" (
    "id" SERIAL NOT NULL,
    "toma5_id" INTEGER,
    "foto1_url" VARCHAR(500) NOT NULL,
    "foto2_url" VARCHAR(500) NOT NULL,
    "fecha_carga" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "tipo" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(100) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "tarea_id" INTEGER,
    "leida" BOOLEAN DEFAULT false,
    "creada_en" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cedula_key" ON "usuarios"("cedula");

-- CreateIndex
CREATE INDEX "idx_usuarios_cedula" ON "usuarios"("cedula");

-- CreateIndex
CREATE INDEX "idx_usuarios_session_token" ON "usuarios"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "supervisores_usuario_id_key" ON "supervisores"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "trabajadores_usuario_id_key" ON "trabajadores"("usuario_id");

-- CreateIndex
CREATE INDEX "idx_tareas_estado" ON "tareas"("estado");

-- CreateIndex
CREATE INDEX "idx_tareas_fecha" ON "tareas"("fecha_tarea");

-- CreateIndex
CREATE INDEX "idx_tareas_grupo" ON "tareas"("tarea_grupo_id");

-- CreateIndex
CREATE INDEX "idx_tareas_supervisor" ON "tareas"("supervisor_id");

-- CreateIndex
CREATE INDEX "idx_tareas_trabajador" ON "tareas"("trabajador_id");

-- CreateIndex
CREATE UNIQUE INDEX "toma5_tarea_id_key" ON "toma5"("tarea_id");

-- CreateIndex
CREATE UNIQUE INDEX "asst_toma5_id_key" ON "asst"("toma5_id");

-- CreateIndex
CREATE INDEX "idx_notificaciones_leida" ON "notificaciones"("leida");

-- CreateIndex
CREATE INDEX "idx_notificaciones_usuario" ON "notificaciones"("usuario_id");

-- AddForeignKey
ALTER TABLE "supervisores" ADD CONSTRAINT "supervisores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trabajadores" ADD CONSTRAINT "trabajadores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "trabajadores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "toma5" ADD CONSTRAINT "toma5_procedimiento_id_fkey" FOREIGN KEY ("procedimiento_id") REFERENCES "procedimientos"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "toma5" ADD CONSTRAINT "toma5_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "toma5" ADD CONSTRAINT "toma5_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "trabajadores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "toma5_respuestas" ADD CONSTRAINT "toma5_respuestas_toma5_id_fkey" FOREIGN KEY ("toma5_id") REFERENCES "toma5"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asst" ADD CONSTRAINT "asst_toma5_id_fkey" FOREIGN KEY ("toma5_id") REFERENCES "toma5"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
