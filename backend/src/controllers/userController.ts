import { Request, Response } from 'express';
import { db } from '../config/db';
import { enviarCredenciales, notificarActualizacion } from '../config/mailer';
import crypto from 'crypto';

// ============================================
// 1. LOGIN
// ============================================
export const login = async (req: Request, res: Response) => {
  const { usuario, password } = req.body;
   
  try {
    const result = await db.execute({
      sql: `
        SELECT 
          id, primer_nombre, primer_apellido, tipo_persona, usuario, password, 
          foto_url, seeb_billetera, needs_password_reset, primera_entrada, estado, cedula
        FROM personas 
        WHERE usuario = ? AND password = ? AND estado = 'Activo'
      `,
      args: [usuario, password]
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        auth: false, 
        message: "Credenciales incorrectas o usuario inactivo" 
      });
    }
    
    const u = result.rows[0] as any;
    console.log("✅ LOGIN EXITOSO:", u.usuario, "ROL:", u.tipo_persona, "needs_password_reset:", u.needs_password_reset);

    res.json({
      auth: true,
      user: {
        id: u.id,
        usuario: u.usuario,
        nombre: `${u.primer_nombre} ${u.primer_apellido}`,
        tipo_persona: u.tipo_persona,
        foto_url: u.foto_url || '',
        seeb_billetera: u.seeb_billetera || '',
        cedula: u.cedula || '',
        iniciales: (u.primer_nombre as string)[0] + (u.primer_apellido as string)[0],
        needs_password_reset: u.needs_password_reset === 1,
        primeraEntrada: u.primera_entrada === 1 && u.tipo_persona === 'Estudiante'
      }
    });

  } catch (error: any) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ 
      auth: false,
      error: "Error en el servidor",
      detalle: error.message
    });
  }
};

// ============================================
// 2. REGISTRAR
// ============================================
export const registrar = async (req: Request, res: Response) => {
    const { 
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, 
        cedula, telefono, correo, tipo_persona, 
        vector_facial, rfid_code, foto_base64 
    } = req.body;

    try {
        if (!primer_nombre || !primer_apellido || !correo || !tipo_persona) {
            return res.status(400).json({ error: "Faltan campos obligatorios" });
        }
        if (!correo.endsWith('@unemi.edu.ec')) {
            return res.status(400).json({ error: "Correo debe ser @unemi.edu.ec" });
        }
        if (cedula && !/^\d{10}$/.test(cedula)) return res.status(400).json({ error: "Cédula inválida" });
        if (telefono && !/^09\d{8}$/.test(telefono)) return res.status(400).json({ error: "Teléfono inválido" });

        const n1 = primer_nombre.charAt(0).toLowerCase();
        const a1 = primer_apellido.toLowerCase().replace(/\s/g, '');
        const a2 = segundo_apellido ? segundo_apellido.charAt(0).toLowerCase() : '';
        
        let usuarioBase = tipo_persona === 'Admin' 
            ? `${n1}${segundo_nombre ? segundo_nombre.charAt(0).toLowerCase() : 'x'}${a1}${a2}`
            : `${n1}${a1}${a2}`;

        let usuarioFinal = usuarioBase;
        let contador = 1;
        while (true) {
            const check = await db.execute({ sql: "SELECT id FROM personas WHERE usuario = ?", args: [usuarioFinal] });
            if (check.rows.length === 0) break;
            usuarioFinal = `${usuarioBase}${contador}`;
            contador++;
        }

        let password = tipo_persona === 'Admin' ? crypto.randomBytes(4).toString('hex') : (cedula || crypto.randomBytes(4).toString('hex'));
        let seedBilletera = (tipo_persona === 'Docente' || tipo_persona === 'Administrativo') ? crypto.randomBytes(16).toString('hex') : null;

        if (cedula) {
            const cedulaExiste = await db.execute({ sql: "SELECT id FROM personas WHERE cedula = ?", args: [cedula] });
            if (cedulaExiste.rows.length > 0) return res.status(400).json({ error: "La cédula ya está registrada" });
        }
        if (rfid_code) {
            const rfidExiste = await db.execute({ sql: "SELECT id FROM personas WHERE rfid_code = ?", args: [rfid_code] });
            if (rfidExiste.rows.length > 0) return res.status(400).json({ error: "El código RFID ya está asignado" });
        }

        const resultado = await db.execute({
            sql: `INSERT INTO personas (
                primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
                correo, tipo_persona, usuario, password, cedula, telefono, 
                seeb_billetera, vector_facial, rfid_code, foto_url, needs_password_reset,
                primera_entrada, matricula_aceptada, rostro_habilitado, rfid_virtual_habilitado, rfid_fisico_habilitado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                primer_nombre, segundo_nombre || null, primer_apellido, segundo_apellido || null,
                correo, tipo_persona, usuarioFinal, password, cedula || null, telefono || null, 
                seedBilletera, null, rfid_code || null, null, 1, 
                tipo_persona === 'Estudiante' ? 1 : 0, 0, 0, 0, 0
            ]
        });

        try {
            enviarCredenciales(correo, `${primer_nombre} ${primer_apellido}`, tipo_persona, usuarioFinal, password);
        } catch (e) { console.warn("⚠️ No se pudo enviar el email, pero el registro fue exitoso"); }

        res.json({ success: true, usuario: usuarioFinal, password: password, id: Number(resultado.lastInsertRowid), message: 'Registrado correctamente' });

    } catch (e: any) {
        console.error("❌ Error registro:", e);
        if (e.message?.includes("UNIQUE")) return res.status(400).json({ error: "Datos duplicados" });
        res.status(500).json({ error: "Error interno", detalle: e.message });
    }
};

// ============================================
// 3. LISTAR PERSONAS
// ============================================
export const obtenerPersonas = async (req: Request, res: Response) => {
  try {
    const result = await db.execute(`SELECT * FROM personas ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Error lista" }); }
};

// ============================================
// 4. ELIMINAR PERSONA
// ============================================
export const eliminarPersona = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adminName } = req.query;

    const personaCheck = await db.execute("SELECT * FROM personas WHERE id = ?", [id]);
    
    if (personaCheck.rows.length === 0) return res.status(404).json({ error: "No encontrado" });

    const p = personaCheck.rows[0] as any;
    
    const titulo = "⚠️ Usuario Eliminado";
    const mensaje = `El Admin "${adminName || 'Sistema'}" eliminó permanentemente al usuario:
    👤 ${p.primer_nombre} ${p.primer_apellido}
    🆔 Cédula: ${p.cedula || 'S/N'} | Usuario: ${p.usuario}
    🎓 Rol: ${p.tipo_persona}`;

    await db.execute({ sql: "DELETE FROM accesos WHERE persona_id = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM matriculas WHERE persona_id = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM notificaciones WHERE persona_id = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM personas WHERE id = ?", args: [id] });

    const admins = await db.execute("SELECT id FROM personas WHERE tipo_persona = 'Admin'");
    if (admins.rows.length > 0) {
        for (const admin of admins.rows) {
            await db.execute({
                sql: `INSERT INTO notificaciones (persona_id, titulo, mensaje, fecha) VALUES (?, ?, ?, datetime('now', 'localtime'))`,
                args: [(admin as any).id, titulo, mensaje]
            });
        }
    }

    res.json({ success: true, message: "Usuario eliminado y notificación generada" });
  } catch (error) { 
    console.error("Error eliminar:", error);
    res.status(500).json({ error: "Error eliminar" }); 
  }
};

// ============================================
// 5. ACTUALIZAR PERSONA
// ============================================
export const actualizarPersona = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const currentRes = await db.execute({ sql: "SELECT * FROM personas WHERE id = ?", args: [id] });
    if (currentRes.rows.length === 0) return res.status(404).json({ error: "No encontrado" });
    
    const current = currentRes.rows[0] as any;
    const body = req.body;

    const primer_nombre = body.primer_nombre ?? current.primer_nombre;
    const segundo_nombre = body.segundo_nombre ?? current.segundo_nombre;
    const primer_apellido = body.primer_apellido ?? current.primer_apellido;
    const segundo_apellido = body.segundo_apellido ?? current.segundo_apellido;
    const correo = body.correo ?? current.correo;
    const telefono = body.telefono ?? current.telefono;
    const cedula = body.cedula ?? current.cedula;
    const estado = body.estado ?? current.estado;
    const rfid_code = body.rfid_code ?? current.rfid_code;
    const vector_facial = body.vector_facial ?? current.vector_facial;
    const foto_url = body.foto_url ?? current.foto_url;
    const seeb_billetera = body.seeb_billetera ?? current.seeb_billetera;

    const rostroBin = body.rostro_habilitado !== undefined ? (body.rostro_habilitado ? 1 : 0) : current.rostro_habilitado;
    const rfidVirtualBin = body.rfid_virtual_habilitado !== undefined ? (body.rfid_virtual_habilitado ? 1 : 0) : current.rfid_virtual_habilitado;
    const rfidFisicoBin = body.rfid_fisico_habilitado !== undefined ? (body.rfid_fisico_habilitado ? 1 : 0) : current.rfid_fisico_habilitado;

    let tipoCambio = "";
    let mensajeNotif = "";

    if (body.rostro_habilitado !== undefined || body.rfid_virtual_habilitado !== undefined || 
        body.rfid_fisico_habilitado !== undefined || body.seeb_billetera !== undefined) {
        tipoCambio = "Actualización de Credenciales";
        mensajeNotif = "Se ha modificado la configuración de tus credenciales de acceso.";
    } 
    else if (body.vector_facial !== undefined || body.foto_url !== undefined) {
        tipoCambio = "Registro Facial Actualizado";
        mensajeNotif = "Se ha actualizado tu foto de perfil y datos biométricos.";
    }
    else if (body.primer_nombre || body.primer_apellido || body.telefono || body.correo || body.cedula) {
        tipoCambio = "Actualización de Datos Personales";
        mensajeNotif = "Tus datos personales han sido actualizados en el sistema.";
    }

    await db.execute({
      sql: `UPDATE personas SET 
        primer_nombre=?, segundo_nombre=?, primer_apellido=?, segundo_apellido=?, 
        correo=?, telefono=?, cedula=?, estado=?, rfid_code=?,
        vector_facial=?, foto_url=?, seeb_billetera=?,
        rostro_habilitado=?, rfid_virtual_habilitado=?, rfid_fisico_habilitado=?
      WHERE id=?`,
      args: [primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, telefono, cedula, estado, rfid_code, vector_facial, foto_url, seeb_billetera, rostroBin, rfidVirtualBin, rfidFisicoBin, id]
    });

    if (tipoCambio) {
        try { notificarActualizacion(correo, `${primer_nombre} ${primer_apellido} - ${tipoCambio}`); } catch(e) {}
        
        await db.execute({
            sql: `INSERT INTO notificaciones (persona_id, titulo, mensaje, fecha) VALUES (?, ?, ?, datetime('now', 'localtime'))`,
            args: [id, tipoCambio, mensajeNotif]
        });
    }
    
    const fechaHora = new Date().toLocaleString('es-EC');
    res.json({ 
        success: true, 
        notificacion: tipoCambio ? { titulo: tipoCambio, mensaje: mensajeNotif, fecha: fechaHora } : null
    });

  } catch (error: any) { 
    console.error(error);
    if (error.message?.includes("UNIQUE")) return res.status(400).json({ error: "Dato duplicado" });
    res.status(500).json({ error: "Error actualizar" }); 
  }
};

// ============================================
// 6. CAMBIAR PASSWORD
// ============================================
export const cambiarPassword = async (req: Request, res: Response) => {
  const { usuario_id, nueva_password } = req.body;
  
  try {
    if (!usuario_id || !nueva_password) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }
    
    if (nueva_password.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    await db.execute({ 
      sql: "UPDATE personas SET password = ?, needs_password_reset = 0 WHERE id = ?", 
      args: [nueva_password, usuario_id] 
    });

    console.log("✅ Contraseña actualizada para usuario ID:", usuario_id);
    
    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (error: any) { 
    console.error("❌ Error cambiar password:", error);
    res.status(500).json({ error: "Error al cambiar contraseña", detalle: error.message }); 
  }
};

// ============================================
// 7. OBTENER VECTORES Y RFID
// ============================================
export const obtenerVectoresFaciales = async (req: Request, res: Response) => {
  try {
    const result = await db.execute(`SELECT id, primer_nombre, primer_apellido, vector_facial, foto_url, estado, tipo_persona FROM personas WHERE vector_facial IS NOT NULL AND estado = 'Activo'`);
    res.json({ success: true, personas: result.rows });
  } catch (error) { res.status(500).json({ error: "Error vectores" }); }
};

export const buscarPorRFID = async (req: Request, res: Response) => {
  try {
    const { rfid_code } = req.params;
    const result = await db.execute({ sql: `SELECT * FROM personas WHERE rfid_code = ?`, args: [rfid_code] });
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'No registrado' });
    const persona = result.rows[0] as any;
    if (persona.estado !== 'Activo') return res.status(403).json({ success: false, error: 'Inactivo' });
    res.json({ success: true, persona });
  } catch (error) { res.status(500).json({ error: "Error RFID" }); }
};

// ============================================
// 8. FUNCIONES DE NOTIFICACIONES (MODIFICADA: AUTO-BORRADO 24H)
// ============================================
export const obtenerNotificaciones = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 🔥 PASO 1: LIMPIEZA AUTOMÁTICA
    // Borrar notificaciones que tengan más de 1 día de antigüedad (-1 day)
    // Esto asegura que cada vez que abras la campanita, la basura vieja desaparezca sola.
    await db.execute({
        sql: `DELETE FROM notificaciones WHERE fecha < datetime('now', '-1 day')`,
        args: []
    });

    // 🔥 PASO 2: OBTENER LAS RECIENTES (LIMPIAS)
    const result = await db.execute({
        sql: `SELECT * FROM notificaciones WHERE persona_id = ? ORDER BY fecha DESC LIMIT 20`,
        args: [id]
    });

    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: "Error notificaciones" }); }
};

export const marcarNotificacionesLeidas = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.execute("UPDATE notificaciones SET leida = 1 WHERE persona_id = ?", [id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Error marcar leídas" }); }
};