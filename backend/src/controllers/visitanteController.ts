import { Request, Response } from 'express';
import { db } from '../config/db';
import { enviarCredenciales, enviarRechazoVisitante } from '../config/mailer';
import crypto from 'crypto';

// ============================================
// VISITANTES: Solicitudes de acceso temporal
// ============================================

export const crearSolicitudVisitante = async (req: Request, res: Response) => {
  try {
    const {
      primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
      cedula, correo, telefono, foto_base64, descripcion,
      documento_base64, nombre_documento
    } = req.body;

    if (!primer_nombre || !primer_apellido || !cedula || !correo || !telefono) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const solicitudActiva = await db.execute(`
        SELECT sv.id, sv.estado, sv.fecha_expiracion
        FROM solicitudes_visitantes sv
        WHERE sv.cedula = ? 
          AND (
              sv.estado = 'Pendiente'
              OR 
              (sv.estado = 'Aprobado' AND sv.fecha_expiracion > datetime('now'))
          )
    `, [cedula]);

    if (solicitudActiva.rows.length > 0) {
      const estadoActual = (solicitudActiva.rows[0] as any).estado;
      let mensajeError = "Ya tienes una solicitud activa.";

      if (estadoActual === 'Pendiente') {
          mensajeError = "Ya tienes una solicitud pendiente de aprobación. Por favor espera la respuesta.";
      } else if (estadoActual === 'Aprobado') {
          mensajeError = "Tu acceso está APROBADO y sigue activo. No puedes solicitar otro acceso hasta que expire.";
      }
      
      return res.status(400).json({ error: mensajeError });
    }

    const resultado = await db.execute({
      sql: `INSERT INTO solicitudes_visitantes (
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cedula, correo, telefono, foto_base64, descripcion, estado, fecha_solicitud,
        documento_base64, nombre_documento 
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', datetime('now'), ?, ?)`,
      args: [
        primer_nombre, segundo_nombre || null, primer_apellido, segundo_apellido || null,
        cedula, correo, telefono, foto_base64 || null, descripcion,
        documento_base64 || null, nombre_documento || null 
      ]
    });

    const nuevoId = Number(resultado.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Solicitud enviada correctamente.",
      id: nuevoId
    });
  } catch (error) {
    console.error("Error creando solicitud:", error);
    res.status(500).json({ error: "Error al crear solicitud" });
  }
};

export const obtenerSolicitudes = async (req: Request, res: Response) => {
  try {
    const resultado = await db.execute(
      `SELECT *, documento_base64, nombre_documento FROM solicitudes_visitantes ORDER BY fecha_solicitud DESC`
    );
    
    const filasSeguras = resultado.rows.map(row => JSON.parse(JSON.stringify(row, (_, v) => typeof v === 'bigint' ? v.toString() : v)));
    
    res.json(filasSeguras);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener solicitudes" });
  }
};

export const obtenerSolicitudPorId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resultado = await db.execute("SELECT * FROM solicitudes_visitantes WHERE id = ?", [id]);
    
    if (resultado.rows.length === 0) return res.status(404).json({ error: "No encontrada" });

    const filaSegura = JSON.parse(JSON.stringify(resultado.rows[0], (_, v) => typeof v === 'bigint' ? v.toString() : v));
    
    res.json(filaSegura);
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
};

// ============================================
// FUNCIÓN DE APROBACIÓN 🔥 SUPER ROBUSTA
// ============================================
export const aprobarSolicitud = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`\n========================================`);
    console.log(`🔥 INICIANDO APROBACIÓN DE SOLICITUD ${id}`);
    console.log(`========================================\n`);

    // 1️⃣ OBTENER SOLICITUD
    const solicitudRes = await db.execute(
      "SELECT * FROM solicitudes_visitantes WHERE id = ?", 
      [id]
    );
    
    if (solicitudRes.rows.length === 0) {
      console.error(`❌ Solicitud ${id} NO ENCONTRADA`);
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    const datos = solicitudRes.rows[0] as any;
    console.log(`✅ Solicitud encontrada:`, datos);

    if (datos.estado === 'Aprobado') {
      console.warn(`⚠️ Solicitud ${id} ya fue APROBADO`);
      return res.status(400).json({ error: "Esta solicitud ya fue aprobada" });
    }

    // 2️⃣ GENERAR CREDENCIALES ÚNICAS
    console.log(`\n🔑 Generando credenciales únicas...`);
    
    // Generar usuario único
    let usuario_temporal = `vis_${datos.cedula.substring(0, 6)}`.toLowerCase();
    let usuarioExiste = true;
    let contador = 1;
    
    while (usuarioExiste) {
      const checkUsuario = await db.execute(
        "SELECT id FROM personas WHERE usuario = ? LIMIT 1",
        [usuario_temporal]
      );
      
      if (checkUsuario.rows.length === 0) {
        usuarioExiste = false;
        console.log(`   ✓ Usuario disponible: ${usuario_temporal}`);
      } else {
        // Si existe, agregar número aleatorio
        usuario_temporal = `vis_${datos.cedula.substring(0, 6)}_${contador}`.toLowerCase();
        contador++;
      }
    }
    
    const password_temporal = crypto.randomBytes(4).toString('hex');
    
    let seebBilletera = 'TEMP-';
    const caracteres = 'ABCDEF0123456789';
    for (let i = 0; i < 8; i++) {
      seebBilletera += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }

    console.log(`✅ Credenciales generadas:`);
    console.log(`   - Usuario: ${usuario_temporal}`);
    console.log(`   - Password: ${password_temporal}`);
    console.log(`   - Billetera: ${seebBilletera}`);

    // 3️⃣ FECHA DE EXPIRACIÓN
    const ahora = new Date();
    const fechaExpiracion = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const fecha_expiracion = fechaExpiracion.toISOString();
    
    console.log(`⏰ Fecha expiración: ${fecha_expiracion}`);

    // 4️⃣ VALIDAR DATOS ANTES DE INSERTAR
    console.log(`\n🔍 Validando datos para INSERT en personas...`);
    
    const datosPersona = {
      primer_nombre: datos.primer_nombre || 'VISITANTE',
      segundo_nombre: datos.segundo_nombre || null,
      primer_apellido: datos.primer_apellido || 'TEMPORAL',
      segundo_apellido: datos.segundo_apellido || null,
      cedula: datos.cedula,
      correo: datos.correo,
      telefono: datos.telefono,
      tipo_persona: 'General',
      usuario: usuario_temporal,
      password: password_temporal,
      seeb_billetera: seebBilletera,
      foto_url: datos.foto_base64 || null,
      needs_password_reset: 0,
      estado: 'Activo',
      rostro_habilitado: 1,
      rfid_virtual_habilitado: 1,
      rfid_fisico_habilitado: 0
    };

    console.log(`   ✓ primer_nombre: ${datosPersona.primer_nombre}`);
    console.log(`   ✓ primer_apellido: ${datosPersona.primer_apellido}`);
    console.log(`   ✓ cedula: ${datosPersona.cedula}`);
    console.log(`   ✓ correo: ${datosPersona.correo}`);
    console.log(`   ✓ telefono: ${datosPersona.telefono}`);
    console.log(`   ✓ usuario: ${datosPersona.usuario}`);

    // 5️⃣ INSERTAR PERSONA
    console.log(`\n📝 Insertando nueva persona en BD...`);
    
    const personaResult = await db.execute({
      sql: `INSERT INTO personas (
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cedula, correo, telefono, tipo_persona, usuario, password,
        seeb_billetera, foto_url, needs_password_reset, estado,
        rostro_habilitado, rfid_virtual_habilitado, rfid_fisico_habilitado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        datosPersona.primer_nombre,
        datosPersona.segundo_nombre,
        datosPersona.primer_apellido,
        datosPersona.segundo_apellido,
        datosPersona.cedula,
        datosPersona.correo,
        datosPersona.telefono,
        datosPersona.tipo_persona,
        datosPersona.usuario,
        datosPersona.password,
        datosPersona.seeb_billetera,
        datosPersona.foto_url,
        datosPersona.needs_password_reset,
        datosPersona.estado,
        datosPersona.rostro_habilitado,
        datosPersona.rfid_virtual_habilitado,
        datosPersona.rfid_fisico_habilitado
      ]
    });

    const persona_id = Number(personaResult.lastInsertRowid);
    console.log(`✅ Persona insertada con ID: ${persona_id}`);

    // 6️⃣ ACTUALIZAR SOLICITUD
    console.log(`\n🔄 Actualizando solicitud ${id}...`);
    
    await db.execute({
      sql: `UPDATE solicitudes_visitantes 
            SET estado = 'Aprobado', persona_id = ?, fecha_expiracion = ? 
            WHERE id = ?`,
      args: [persona_id, fecha_expiracion, id]
    });

    console.log(`✅ Solicitud actualizada a APROBADO`);

    // 7️⃣ ENVIAR EMAIL
    console.log(`\n📧 Enviando email de aprobación...`);
    
    try {
      await enviarCredenciales(
        datos.correo,
        `${datos.primer_nombre} ${datos.primer_apellido}`,
        'Visitante - Acceso APROBADO',
        usuario_temporal,
        password_temporal
      );
      console.log(`✅ Email enviado a ${datos.correo}`);
    } catch (emailError) {
      console.warn(`⚠️ Email falló (continuamos anyway)`, emailError);
    }

    console.log(`\n✅ APROBACIÓN COMPLETADA EXITOSAMENTE`);
    console.log(`========================================\n`);

    res.json({
      success: true,
      message: "Solicitud aprobada por 24 horas.",
      fecha_expiracion,
      usuario: usuario_temporal,
      persona_id
    });

  } catch (error: any) {
    console.error(`\n❌ ERROR EN APROBACIÓN:`);
    console.error(`   Mensaje: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error(`========================================\n`);
    
    res.status(500).json({ 
      error: "Error al aprobar solicitud",
      detalle: error.message
    });
  }
};

// ============================================
// FUNCIÓN DE RECHAZO
// ============================================
export const rechazarSolicitud = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { razon_rechazo } = req.body;

    console.log(`\n========================================`);
    console.log(`🔴 RECHAZANDO SOLICITUD ${id}`);
    console.log(`========================================\n`);

    const solicitud = await db.execute("SELECT * FROM solicitudes_visitantes WHERE id = ?", [id]);
    if (solicitud.rows.length === 0) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }
    
    const datos = solicitud.rows[0] as any;
    const razonFinal = razon_rechazo || "Los datos no cumplen con las políticas de acceso.";

    await db.execute(
      `UPDATE solicitudes_visitantes SET estado = 'Rechazado', razon_rechazo = ? WHERE id = ?`,
      [razonFinal, id]
    );
    
    console.log(`✅ Solicitud marcada como RECHAZADO`);

    try {
      await enviarRechazoVisitante(
        datos.correo,
        `${datos.primer_nombre} ${datos.primer_apellido}`,
        razonFinal
      );
      console.log(`✅ Email de rechazo enviado`);
    } catch (e) {
      console.warn(`⚠️ Email falló pero se rechazó la solicitud`);
    }

    console.log(`========================================\n`);

    res.json({ success: true, message: "Solicitud rechazada" });
  } catch (error: any) {
    console.error(`❌ ERROR RECHAZANDO:`, error.message);
    res.status(500).json({ error: "Error al rechazar", detalle: error.message });
  }
};