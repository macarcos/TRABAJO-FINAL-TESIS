import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || "libsql://error";
const authToken = process.env.TURSO_AUTH_TOKEN || "error";

export const db = createClient({ url, authToken });

// ESTA ES LA FUNCIÓN QUE TE FALTABA
export const initDB = async () => {
  try {
    // Definir tabla de Personas
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
        
        -- SEGURIDAD
        needs_password_reset INTEGER DEFAULT 1,

        -- DATOS
        cedula TEXT, 
        telefono TEXT,
        
        -- TECNOLOGÍA
        seed_billetera TEXT, 
        rfid_code TEXT UNIQUE,
        vector_facial TEXT,
        foto_url TEXT,
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Definir tabla de Accesos
    await db.execute(`
      CREATE TABLE IF NOT EXISTS accesos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id INTEGER NOT NULL,
        metodo TEXT NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(persona_id) REFERENCES personas(id)
      )
    `);

    console.log("✅ Base de Datos Sincronizada.");
    await crearSuperAdmin();
  } catch (error) {
    console.error("❌ Error al iniciar DB:", error);
  }
};

const crearSuperAdmin = async () => {
  try {
    const check = await db.execute("SELECT id FROM personas WHERE usuario = 'admin'");
    if (check.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO personas (
          primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
          correo, tipo_persona, usuario, password, needs_password_reset
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        args: ['Súper', 'Admin', 'Sistema', 'UNEMI', process.env.MAIL_USER || 'admin', 'Admin', 'admin', 'adm123']
      });
      console.log("⚡ Súper Admin Creado: admin / adm123");
    }
  } catch (e) { console.log("Info: Admin ya existe."); }
};