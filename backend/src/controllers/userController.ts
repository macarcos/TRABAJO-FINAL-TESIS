import { Request, Response } from 'express';
import { db } from '../config/db';
import { enviarCredenciales } from '../config/mailer';
import crypto from 'crypto';

// ============================================
// 🔧 FUNCIÓN AUXILIAR: GENERAR CÓDIGO ALFANUMÉRICO
// ============================================
function generarCodigoAlfanumerico(): string {
  // Solo letras mayúsculas y números (sin O, I, 0, 1 para evitar confusión)
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  
  for (let i = 0; i < 8; i++) {
    const indiceAleatorio = Math.floor(Math.random() * caracteres.length);
    codigo += caracteres[indiceAleatorio];
  }
  
  return codigo;
}

// ============================================
// 1. LOGIN (✅ CORREGIDO - Incluye seed_billetera y foto_url)
// ============================================
export const login = async (req: Request, res: Response) => {
  const { usuario, password } = req.body;
  
  try {
    // ✅ BUSCAR USUARIO EN LA BASE DE DATOS
    const result = await db.execute({
      sql: `
        SELECT 
          id,
          primer_nombre,
          primer_apellido,
          tipo_persona,
          usuario,
          password,
          foto_url,
          seed_billetera,
          needs_password_reset,
          estado
        FROM personas 
        WHERE usuario = ? AND password = ? AND estado = 'Activo'
      `,
      args: [usuario, password]
    });

    // ✅ VALIDAR CREDENCIALES
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        auth: false, 
        message: "Credenciales incorrectas o usuario inactivo" 
      });
    }
    
    const u = result.rows[0] as any;
    
    console.log("✅ LOGIN EXITOSO:", u.usuario, "ROL:", u.tipo_persona, "RESET:", u.needs_password_reset);

    // ✅ RESPUESTA COMPLETA CON TODOS LOS DATOS
    res.json({
      auth: true,
      user: {
        id: u.id,
        usuario: u.usuario,
        nombre: `${u.primer_nombre} ${u.primer_apellido}`,
        rol: u.tipo_persona,
        foto_url: u.foto_url || '',
        seed_billetera: u.seed_billetera || '',
        iniciales: (u.primer_nombre as string)[0] + (u.primer_apellido as string)[0],
        needsReset: u.needs_password_reset === 1
      }
    });

  } catch (error: any) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ 
      auth: false,
      error: "Error en el servidor" 
    });
  }
};

// ============================================
// 2. REGISTRAR (✅ CON CÓDIGO ALFANUMÉRICO)
// ============================================
export const registrar = async (req: Request, res: Response) => {
    const { 
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, 
        cedula, telefono, correo, tipo_persona, 
        vector_facial, rfid_code, foto_base64 
    } = req.body;

    try {
        // ✅ VALIDACIÓN 1: Campos obligatorios
        if (!primer_nombre || !primer_apellido || !correo || !tipo_persona) {
            return res.status(400).json({ 
                error: "Faltan campos obligatorios: primer_nombre, primer_apellido, correo, tipo_persona" 
            });
        }

        // ✅ VALIDACIÓN 2: Correo institucional
        if (!correo.endsWith('@unemi.edu.ec')) {
            return res.status(400).json({ error: "Correo debe ser @unemi.edu.ec" });
        }

        // ✅ VALIDACIÓN 3: Foto y vector facial (SOLO SI NO ES ADMIN)
        if (tipo_persona !== 'Admin') {
            if (!foto_base64 || !vector_facial) {
                return res.status(400).json({ 
                    error: "Se requiere foto y vector facial para usuarios no administrativos" 
                });
            }

            // ✅ VALIDACIÓN 4: Vector facial debe ser array de 128 números
            if (!Array.isArray(vector_facial) || vector_facial.length !== 128) {
                return res.status(400).json({ 
                    error: `El vector facial debe ser un array de 128 números (recibido: ${vector_facial?.length})` 
                });
            }
        }

        // ✅ GENERAR USUARIO ÚNICO
        const n1 = primer_nombre.charAt(0).toLowerCase();
        const a1 = primer_apellido.toLowerCase().replace(/\s/g, '');
        const a2 = segundo_apellido ? segundo_apellido.charAt(0).toLowerCase() : '';
        
        let usuarioBase = "";
        if (tipo_persona === 'Admin') {
            const n2 = segundo_nombre ? segundo_nombre.charAt(0).toLowerCase() : 'x';
            usuarioBase = `${n1}${n2}${a1}${a2}`;
        } else {
            usuarioBase = `${n1}${a1}${a2}`;
        }

        let usuarioFinal = usuarioBase;
        let contador = 1;
        while (true) {
            const check = await db.execute({ 
                sql: "SELECT id FROM personas WHERE usuario = ?", 
                args: [usuarioFinal] 
            });
            if (check.rows.length === 0) break;
            usuarioFinal = `${usuarioBase}${contador}`;
            contador++;
        }

        // ✅ GENERAR PASSWORD
        let password = tipo_persona === 'Admin' 
            ? crypto.randomBytes(4).toString('hex') 
            : (cedula || crypto.randomBytes(4).toString('hex'));

        // ✅ GENERAR CÓDIGO ALFANUMÉRICO DE BILLETERA (8 caracteres para no-Admins)
        let seed = null;
        if (tipo_persona !== 'Admin') {
            // Generar código único (verificar que no exista)
            let codigoUnico = generarCodigoAlfanumerico();
            let intentos = 0;
            
            while (intentos < 10) {
                const existe = await db.execute({
                    sql: "SELECT id FROM personas WHERE seed_billetera = ?",
                    args: [codigoUnico]
                });
                
                if (existe.rows.length === 0) {
                    seed = codigoUnico;
                    break;
                }
                
                codigoUnico = generarCodigoAlfanumerico();
                intentos++;
            }
            
            // Si después de 10 intentos sigue duplicado, usar el último generado
            if (!seed) seed = codigoUnico;
        }

        // ✅ VERIFICAR CÉDULA DUPLICADA (solo si se proporcionó)
        if (cedula) {
            const cedulaExiste = await db.execute({
                sql: "SELECT id FROM personas WHERE cedula = ?",
                args: [cedula]
            });
            if (cedulaExiste.rows.length > 0) {
                return res.status(400).json({ error: "La cédula ya está registrada" });
            }
        }

        // ✅ VERIFICAR RFID DUPLICADO (solo si se proporcionó)
        if (rfid_code) {
            const rfidExiste = await db.execute({
                sql: "SELECT id FROM personas WHERE rfid_code = ?",
                args: [rfid_code]
            });
            if (rfidExiste.rows.length > 0) {
                return res.status(400).json({ error: "El código RFID ya está asignado" });
            }
        }

        // ✅ INSERTAR EN BASE DE DATOS
        const resultado = await db.execute({
            sql: `INSERT INTO personas (
                primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
                correo, tipo_persona, usuario, password, cedula, telefono, 
                seed_billetera, vector_facial, rfid_code, foto_url, needs_password_reset
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                primer_nombre, 
                segundo_nombre || '', 
                primer_apellido, 
                segundo_apellido || '',
                correo, 
                tipo_persona, 
                usuarioFinal, 
                password, 
                cedula || null, 
                telefono || null, 
                seed,
                vector_facial ? JSON.stringify(vector_facial) : null,
                rfid_code || null, 
                foto_base64 || null,
                tipo_persona === 'Admin' ? 1 : 1
            ]
        });

        // ✅ ENVIAR CREDENCIALES (con manejo de errores)
        try {
            enviarCredenciales(
                correo, 
                `${primer_nombre} ${primer_apellido}`, 
                tipo_persona, 
                usuarioFinal, 
                password
            );
        } catch (emailError) {
            console.warn("⚠️ No se pudo enviar el email, pero el registro fue exitoso");
        }

        // ✅ RESPUESTA EXITOSA
        res.json({ 
            success: true, 
            usuario: usuarioFinal,
            password: password,
            seed_billetera: seed,
            id: Number(resultado.lastInsertRowid),
            message: tipo_persona === 'Admin' 
                ? 'Administrador registrado exitosamente. Debe cambiar contraseña al primer ingreso.'
                : `Persona registrada exitosamente. Código de billetera: ${seed}`
        });

    } catch (e: any) {
        console.error("❌ Error en registro:", e);
        
        if (e.message?.includes("UNIQUE")) {
            return res.status(400).json({ error: "Datos duplicados (Cédula/RFID/Correo)" });
        }
        
        res.status(500).json({ 
            error: "Error interno al registrar",
            detalle: e.message
        });
    }
};

// ============================================
// 3. LISTAR
// ============================================
export const obtenerPersonas = async (req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT 
        id, 
        primer_nombre, 
        segundo_nombre, 
        primer_apellido, 
        segundo_apellido, 
        cedula, 
        correo, 
        telefono, 
        tipo_persona, 
        estado, 
        usuario, 
        rfid_code,
        foto_url,
        vector_facial,
        seed_billetera,
        created_at
      FROM personas 
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Enviando ${result.rows.length} personas al frontend`);
    res.json(result.rows);
  } catch (error) { 
    console.error("❌ Error obteniendo personas:", error); 
    res.status(500).json({ error: "Error lista" }); 
  }
};

// ============================================
// 4. ELIMINAR
// ============================================
export const eliminarPersona = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // ✅ PRIMERO: Eliminar todos los accesos de esta persona
    await db.execute({ 
      sql: "DELETE FROM accesos WHERE persona_id = ?", 
      args: [id] 
    });
    
    // ✅ SEGUNDO: Eliminar la persona
    await db.execute({ 
      sql: "DELETE FROM personas WHERE id = ?", 
      args: [id] 
    });
    
    res.json({ success: true });
  } catch (error) { 
    console.error("Error al eliminar:", error);
    res.status(500).json({ error: "Error eliminar" }); 
  }
};

// ============================================
// 5. ACTUALIZAR
// ============================================
export const actualizarPersona = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, telefono, estado, rfid_code } = req.body;
  try {
    await db.execute({
      sql: `UPDATE personas SET primer_nombre=?, segundo_nombre=?, primer_apellido=?, segundo_apellido=?, correo=?, telefono=?, estado=?, rfid_code=? WHERE id=?`,
      args: [primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, telefono, estado, rfid_code, id]
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Error actualizar" }); }
};

// ============================================
// 6. CAMBIAR PASSWORD
// ============================================
export const cambiarPassword = async (req: Request, res: Response) => {
  const { usuario, nueva_password } = req.body;
  try {
    await db.execute({
      sql: "UPDATE personas SET password = ?, needs_password_reset = 0 WHERE usuario = ?",
      args: [nueva_password, usuario]
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Error password" }); }
};

// ============================================
// 7. OBTENER VECTORES FACIALES
// ============================================
export const obtenerVectoresFaciales = async (req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT 
        id,
        primer_nombre,
        primer_apellido,
        vector_facial,
        foto_url,
        estado,
        tipo_persona
      FROM personas
      WHERE vector_facial IS NOT NULL AND estado = 'Activo'
    `);

    res.json({
      success: true,
      personas: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo vectores faciales:', error);
    res.status(500).json({ error: "Error al obtener vectores faciales" });
  }
};

// ============================================
// 8. BUSCAR POR RFID
// ============================================
export const buscarPorRFID = async (req: Request, res: Response) => {
  try {
    const { rfid_code } = req.params;

    const result = await db.execute({
      sql: `
        SELECT 
          id,
          primer_nombre,
          primer_apellido,
          tipo_persona,
          foto_url,
          estado
        FROM personas
        WHERE rfid_code = ?
      `,
      args: [rfid_code]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Tarjeta RFID no registrada' 
      });
    }

    const persona = result.rows[0] as any;

    if (persona.estado !== 'Activo') {
      return res.status(403).json({ 
        success: false,
        error: 'Usuario inactivo' 
      });
    }

    res.json({
      success: true,
      persona: persona
    });

  } catch (error) {
    console.error('❌ Error buscando por RFID:', error);
    res.status(500).json({ error: "Error al buscar persona" });
  }
};