import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || "libsql://error";
const authToken = process.env.TURSO_AUTH_TOKEN || "error";

export const db = createClient({ url, authToken });

// ✅ INICIALIZAR BASE DE DATOS
export const initDB = async () => {
  try {
    // ==============================================================================
    // ⚠️ ZONA DE PELIGRO: BORRADO DE BASE DE DATOS
    // ==============================================================================
    // 1. QUITA las barras '//' de las dos líneas de abajo para BORRAR TODO.
    // 2. Guarda el archivo y deja que el servidor reinicie.
    // 3. VUELVE A PONER las barras '//' para que no se borre de nuevo.
    // ==============================================================================
    
    //await db.execute("DROP TABLE IF EXISTS accesos");
    //await db.execute("DROP TABLE IF EXISTS personas");

    // ==============================================================================

    console.log("🔄 Verificando tablas...");

    // 1. Definir tabla de Personas (Se creará de nuevo si la borraste arriba)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS personas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        primer_nombre TEXT NOT NULL,
        segundo_nombre TEXT,
        primer_apellido TEXT NOT NULL,
        segundo_apellido TEXT,
        correo TEXT NOT NULL,
        tipo_persona TEXT CHECK(tipo_persona IN ('Estudiante', 'Docente', 'Administrativo', 'General', 'Admin')) NOT NULL,
        usuario TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        estado TEXT DEFAULT 'Activo',
        needs_password_reset INTEGER DEFAULT 1,
        cedula TEXT, 
        telefono TEXT,
        seeb_billetera TEXT,
        rfid_code TEXT UNIQUE,
        vector_facial TEXT,
        foto_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Definir tabla de Accesos MEJORADA (Con las nuevas columnas)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS accesos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id INTEGER NOT NULL,
        metodo TEXT NOT NULL CHECK(metodo IN (
          'Reconocimiento Facial', 
          'RFID Físico', 
          'RFID Virtual', 
          'SEEB Billetera Virtual'
        )),
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        -- ✅ COLUMNAS NUEVAS (Aparecerán al reiniciar la tabla)
        foto_verificacion_base64 TEXT,
        confianza_facial INTEGER,
        dispositivo TEXT,
        
        FOREIGN KEY(persona_id) REFERENCES personas(id)
      )
    `);

    console.log("✅ Base de Datos Sincronizada (Estructura Nueva).");
    await crearSuperAdmin();
  } catch (error) {
    console.error("❌ Error al iniciar DB:", error);
  }
};

const crearSuperAdmin = async () => {
  try {
    // Si borraste la tabla, esto volverá a crear al admin automáticamente
    const check = await db.execute("SELECT id FROM personas WHERE usuario = 'admin'");
    if (check.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO personas (
          primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
          correo, tipo_persona, usuario, password, needs_password_reset
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        args: ['Súper', 'Admin', 'Sistema', 'UNEMI', process.env.MAIL_USER || 'admin', 'Admin', 'admin', 'adm123']
      });
      console.log("⚡ Súper Admin Restaurado: admin / adm123");
    }
  } catch (e) { console.log("Info: Admin ya existe."); }
};