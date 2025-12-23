import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || "libsql://error";
const authToken = process.env.TURSO_AUTH_TOKEN || "error";

export const db = createClient({ url, authToken });

export const initDB = async () => {
  try {
    console.log("⏳ Verificando estructura de base de datos...");

    // =====================================================================
    // 🚨 ZONA DE RESET DE EMERGENCIA 🚨
    // Si tienes datos corruptos o tablas viejas que no dejan borrar,
    // DESCOMENTA las siguientes líneas (quítales las //), guarda y reinicia el servidor.
    // Se borrará TODO y se creará limpio. Luego vuelve a comentarlas.
    // =====================================================================
    
    /*
    console.log("🧨 MODO RESET: Borrando tablas antiguas...");
    await db.execute("DROP TABLE IF EXISTS notificaciones");
    await db.execute("DROP TABLE IF EXISTS accesos");
    await db.execute("DROP TABLE IF EXISTS solicitudes_visitantes");
    await db.execute("DROP TABLE IF EXISTS matriculas");
    await db.execute("DROP TABLE IF EXISTS periodos");
    await db.execute("DROP TABLE IF EXISTS personas");
    */
    
    // =====================================================================
    
    // ========== 1. TABLA PERSONAS ==========
    await db.execute(`
      CREATE TABLE IF NOT EXISTS personas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        primer_nombre TEXT NOT NULL,
        segundo_nombre TEXT,
        primer_apellido TEXT NOT NULL,
        segundo_apellido TEXT,
        correo TEXT,
        tipo_persona TEXT CHECK(tipo_persona IN ('Estudiante', 'Docente', 'Administrativo', 'General', 'Admin')) NOT NULL,
        usuario TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        estado TEXT DEFAULT 'Activo',
        
        -- SEGURIDAD
        needs_password_reset INTEGER DEFAULT 1,

        -- DATOS
        cedula TEXT UNIQUE, 
        telefono TEXT,
        
        -- TECNOLOGÍA Y CREDENCIALES
        seeb_billetera TEXT UNIQUE,
        rfid_code TEXT UNIQUE,
        vector_facial TEXT,
        foto_url TEXT,
        
        -- HABILITACIÓN DE CREDENCIALES
        rostro_habilitado INTEGER DEFAULT 0,
        rfid_virtual_habilitado INTEGER DEFAULT 0,
        rfid_fisico_habilitado INTEGER DEFAULT 0,
        
        -- MATRÍCULAS Y CONTROL
        primera_entrada INTEGER DEFAULT 1,
        matricula_aceptada INTEGER DEFAULT 0,
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ========== 2. TABLA PERIODOS ACADÉMICOS ==========
    await db.execute(`
      CREATE TABLE IF NOT EXISTS periodos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT NOT NULL,
        estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ========== 3. TABLA MATRÍCULAS ==========
    await db.execute(`
      CREATE TABLE IF NOT EXISTS matriculas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id INTEGER NOT NULL,
        periodo_id INTEGER NOT NULL,
        estado TEXT DEFAULT 'Activa' CHECK(estado IN ('Activa', 'Inactiva')),
        fecha_aceptacion DATETIME,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(persona_id) REFERENCES personas(id) ON DELETE CASCADE,
        FOREIGN KEY(periodo_id) REFERENCES periodos(id) ON DELETE CASCADE,
        UNIQUE(persona_id, periodo_id)
      )
    `);

    // DENTRO DE initDB en solicitudes_visitantes
    await db.execute(`
      CREATE TABLE IF NOT EXISTS solicitudes_visitantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        primer_nombre TEXT NOT NULL,
        segundo_nombre TEXT,
        primer_apellido TEXT NOT NULL,
        segundo_apellido TEXT,
        cedula TEXT NOT NULL, -- 🚨 ELIMINADO EL UNIQUE AQUÍ PARA PERMITIR HISTORIAL
        correo TEXT NOT NULL,
        telefono TEXT NOT NULL,
        foto_base64 TEXT,
        vector_facial TEXT, 
        descripcion TEXT,
        documento_base64 TEXT,
        nombre_documento TEXT,
        estado TEXT DEFAULT 'Pendiente' CHECK(estado IN ('Pendiente', 'Aprobado', 'Rechazado', 'Expirado')),
        razon_rechazo TEXT,
        persona_id INTEGER,
        fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_expiracion DATETIME,
        FOREIGN KEY(persona_id) REFERENCES personas(id) ON DELETE CASCADE
      )
    `);

    // Crea un índice normal para que las búsquedas por cédula sean rápidas pero NO únicas
    try {
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_cedula_visitante ON solicitudes_visitantes(cedula)`);
    } catch(e) {}

    // ========== 5. TABLA ACCESOS ==========
    await db.execute(`
      CREATE TABLE IF NOT EXISTS accesos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id INTEGER,  
        visitante_id INTEGER, 
        metodo TEXT NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        foto_verificacion_base64 TEXT,
        confianza_facial INTEGER,
        FOREIGN KEY(persona_id) REFERENCES personas(id) ON DELETE CASCADE,
        FOREIGN KEY(visitante_id) REFERENCES solicitudes_visitantes(id) ON DELETE CASCADE
      )
    `);

    // =========================================================================
    // 🔥 NUEVA TABLA AGREGADA: NOTIFICACIONES (PARA LA CAMPANITA)
    // =========================================================================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id INTEGER NOT NULL,
        titulo TEXT,
        mensaje TEXT,
        leida INTEGER DEFAULT 0,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
      )
    `);
    
    // ========== 6. VERIFICAR COLUMNAS EXTRA ==========
    await verificarColumnas();

    console.log("✅ Base de Datos Sincronizada Correctamente.");
    
    await crearSuperAdmin();
    await crearPeriodosDefault();

  } catch (error) {
    console.error("❌ Error al iniciar DB:", error);
  }
};

// ========== FUNCIÓN AUXILIAR PARA VERIFICAR Y LIMPIAR COLUMNAS ==========
const verificarColumnas = async () => {
  // 1. Limpieza seed_billetera (legacy)
  try {
    await db.execute(`ALTER TABLE personas DROP COLUMN seed_billetera`);
  } catch (e: any) {}

  // 2. Columnas Personas
  const columnasPersonas = [
    { nombre: 'seeb_billetera', tipo: 'TEXT' },
    { nombre: 'rostro_habilitado', tipo: 'INTEGER DEFAULT 0' },
    { nombre: 'rfid_virtual_habilitado', tipo: 'INTEGER DEFAULT 0' },
    { nombre: 'rfid_fisico_habilitado', tipo: 'INTEGER DEFAULT 0' },
    { nombre: 'matricula_aceptada', tipo: 'INTEGER DEFAULT 0' }
  ];

  for (const columna of columnasPersonas) {
    try {
      await db.execute(`ALTER TABLE personas ADD COLUMN ${columna.nombre} ${columna.tipo}`);
      // console.log(`✅ Columna agregada a personas: ${columna.nombre}`);
    } catch (e: any) {}
  }

  // 3. Columna Visitantes
  try {
    await db.execute(`ALTER TABLE solicitudes_visitantes ADD COLUMN vector_facial TEXT`);
  } catch (e: any) {}

  // 4. Índices
  try {
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_seeb_billetera ON personas(seeb_billetera) WHERE seeb_billetera IS NOT NULL`);
  } catch (e: any) {}
};

const crearSuperAdmin = async () => {
  try {
    const check = await db.execute("SELECT id FROM personas WHERE usuario = 'admin'");
    if (check.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO personas (
          primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
          correo, tipo_persona, usuario, password, needs_password_reset,
          rostro_habilitado, rfid_virtual_habilitado, rfid_fisico_habilitado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 1, 1)`,
        args: [
          'Súper', 'Admin', 'Sistema', 'UNEMI', 
          process.env.MAIL_USER || 'admin@unemi.edu.ec', 
          'Admin', 'admin', 'adm123'
        ]
      });
      console.log("⚡ Súper Admin Creado: admin / adm123");
    }
  } catch (e: any) {}
};

const crearPeriodosDefault = async () => {
  try {
    const check = await db.execute("SELECT id FROM periodos LIMIT 1");
    if (check.rows.length === 0) {
      const hoy = new Date();
      const fechaInicio = hoy.toISOString().split('T')[0];
      const fechaFin = new Date(hoy.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const nombrePeriodo = `Período ${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

      await db.execute({
        sql: `INSERT INTO periodos (nombre, fecha_inicio, fecha_fin, estado)
              VALUES (?, ?, ?, 'Activo')`,
        args: [nombrePeriodo, fechaInicio, fechaFin]
      });
      console.log("⚡ Período académico por defecto creado");
    }
  } catch (e: any) {}
};