import { Request, Response } from 'express';
import { db } from '../config/db';
import { enviarCredenciales, enviarRechazoVisitante } from '../config/mailer';
import crypto from 'crypto';

// ✅ FUNCIÓN PARA LIMPIAR BIGINT (Evita Error 500 al enviar JSON)
const limpiarRespuesta = (data: any) => {
    return JSON.parse(JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v));
};

// ============================================
// CREAR SOLICITUD
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

        // 🔍 Verificar si tiene una solicitud REALMENTE activa (Pendiente o Aprobada Vigente)
        const solicitudActiva = await db.execute(`
            SELECT id, estado, fecha_expiracion FROM solicitudes_visitantes 
            WHERE cedula = ? 
              AND (
                  estado = 'Pendiente'
                  OR 
                  (estado = 'Aprobado' AND fecha_expiracion > datetime('now'))
              )
            LIMIT 1
        `, [cedula]);

        if (solicitudActiva.rows.length > 0) {
            const estadoActual = (solicitudActiva.rows[0] as any).estado;
            let mensajeError = "Ya tienes una solicitud activa.";
            if (estadoActual === 'Pendiente') mensajeError = "Ya tienes una solicitud pendiente de aprobación.";
            else mensajeError = "Tu acceso aún está vigente (menos de 24h). No puedes solicitar otro hasta que expire.";
            
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

        res.status(201).json({ success: true, message: "Solicitud enviada correctamente.", id: Number(resultado.lastInsertRowid) });
    } catch (error) {
        console.error("Error creando solicitud:", error);
        res.status(500).json({ error: "Error al crear solicitud" });
    }
};

// ============================================
// OBTENER TODAS (CON GROUP BY PARA EVITAR DUPLICADOS)
// ============================================
export const obtenerSolicitudes = async (req: Request, res: Response) => {
    try {
        const sql = `
            SELECT 
                sv.id, sv.primer_nombre, sv.primer_apellido, sv.cedula, 
                sv.correo, sv.telefono, sv.descripcion, sv.foto_base64,
                sv.documento_base64, sv.nombre_documento, sv.estado, 
                sv.fecha_solicitud, sv.fecha_expiracion, sv.razon_rechazo,
                (SELECT COUNT(*) FROM solicitudes_visitantes v2 WHERE v2.cedula = sv.cedula AND v2.estado = 'Aprobado') as total_aprobados,
                (SELECT COUNT(*) FROM solicitudes_visitantes v2 WHERE v2.cedula = sv.cedula AND v2.estado = 'Rechazado') as total_rechazados
            FROM solicitudes_visitantes sv
            WHERE sv.id IN (
                SELECT MAX(id) 
                FROM solicitudes_visitantes 
                GROUP BY cedula
            )
            ORDER BY sv.fecha_solicitud DESC
        `;

        const resultado = await db.execute(sql);
        res.json(limpiarRespuesta(resultado.rows));
    } catch (error: any) {
        console.error("Error:", error);
        res.status(500).json({ error: "Error al obtener solicitudes" });
    }
};

// ============================================
// APROBAR SOLICITUD
// ============================================
export const aprobarSolicitud = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        console.log(`\n========================================`);
        console.log(`🔥 APROBANDO ACCESO BIOMÉTRICO SOLICITUD ${id}`);
        console.log(`========================================\n`);

        const solicitudRes = await db.execute("SELECT * FROM solicitudes_visitantes WHERE id = ?", [id]);
        if (solicitudRes.rows.length === 0) return res.status(404).json({ error: "No encontrada" });

        const datos = solicitudRes.rows[0] as any;
        const fechaExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await db.execute({
            sql: `UPDATE solicitudes_visitantes 
                  SET estado = 'Aprobado', fecha_expiracion = ?, razon_rechazo = 'Acceso concedido por 24 horas'
                  WHERE id = ?`,
            args: [fechaExpiracion, id]
        });

        try {
            await enviarCredenciales(datos.correo, `${datos.primer_nombre} ${datos.primer_apellido}`, 
                'Visitante - Acceso APROBADO', 'Acceso Biométrico', 'Usa tu Rostro');
        } catch (e) { console.warn(`⚠️ Email falló`, e); }

        res.json({ success: true, message: "Acceso habilitado por 24 horas.", fecha_expiracion: fechaExpiracion });
    } catch (error: any) {
        res.status(500).json({ error: "Error al aprobar", detalle: error.message });
    }
};

// ============================================
// RECHAZAR SOLICITUD
// ============================================
export const rechazarSolicitud = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { razon_rechazo } = req.body;

        const solicitud = await db.execute("SELECT * FROM solicitudes_visitantes WHERE id = ?", [id]);
        if (solicitud.rows.length === 0) return res.status(404).json({ error: "No encontrada" });

        const datos = solicitud.rows[0] as any;
        const razonFinal = razon_rechazo || "Los datos no cumplen con las políticas de acceso.";

        await db.execute(`UPDATE solicitudes_visitantes SET estado = 'Rechazado', razon_rechazo = ?, fecha_expiracion = NULL WHERE id = ?`, [razonFinal, id]);

        try {
            await enviarRechazoVisitante(datos.correo, `${datos.primer_nombre} ${datos.primer_apellido}`, razonFinal);
        } catch (e) { console.warn(`⚠️ Email falló`); }

        res.json({ success: true, message: "Solicitud rechazada" });
    } catch (error: any) {
        res.status(500).json({ error: "Error al rechazar", detalle: error.message });
    }
};

// ============================================
// CORREGIR DECISIÓN
// ============================================
export const corregirDecision = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await db.execute({
            sql: "UPDATE solicitudes_visitantes SET estado = 'Pendiente', fecha_expiracion = NULL, razon_rechazo = NULL WHERE id = ?",
            args: [id]
        });
        res.json({ success: true, message: "Solicitud reseteada a Pendiente" });
    } catch (error: any) {
        console.error("Error corrigiendo decisión:", error);
        res.status(500).json({ error: "Error al corregir" });
    }
};

// ============================================
// ELIMINAR MASIVO
// ============================================
export const eliminarSolicitudes = async (req: Request, res: Response) => {
    try {
        const { tipo, admin_id } = req.body;
        let sqlDelete = "";
        let sqlCount = "";
        let nombreTipo = "";

        // 1. Definir consultas y corregir el paréntesis faltante en datetime
        if (tipo === 'Todo') {
            sqlCount = "SELECT COUNT(*) as total FROM solicitudes_visitantes WHERE estado != 'Pendiente'";
            sqlDelete = "DELETE FROM solicitudes_visitantes WHERE estado != 'Pendiente'";
            nombreTipo = "procesadas";
        } else if (tipo === 'Expirado') {
            // ✅ Corregido: Se añadió el ")" que faltaba al final de datetime('now')
            sqlCount = "SELECT COUNT(*) as total FROM solicitudes_visitantes WHERE estado = 'Aprobado' AND fecha_expiracion < datetime('now')";
            sqlDelete = "DELETE FROM solicitudes_visitantes WHERE estado = 'Aprobado' AND fecha_expiracion < datetime('now')";
            nombreTipo = "expiradas";
        } else {
            sqlCount = `SELECT COUNT(*) as total FROM solicitudes_visitantes WHERE estado = '${tipo}'`;
            sqlDelete = `DELETE FROM solicitudes_visitantes WHERE estado = '${tipo}'`;
            nombreTipo = tipo.toLowerCase();
        }

        // 2. Verificar si existen registros antes de intentar borrar
        const conteoRes = await db.execute(sqlCount);
        const total = conteoRes.rows[0].total;

        if (Number(total) === 0) {
            return res.status(200).json({ 
                success: false, 
                message: `No existen solicitudes ${nombreTipo} para eliminar.` 
            });
        }

        // 3. Ejecutar la eliminación si hay datos
        await db.execute(sqlDelete);

        // 4. Notificar (Opcional, manteniendo tu lógica anterior)
        const adminRes = await db.execute({
            sql: "SELECT primer_nombre FROM personas WHERE id = ?",
            args: [admin_id]
        });
        const adminNombre = adminRes.rows[0]?.primer_nombre || "Un Administrador";

        await db.execute({
            sql: "INSERT INTO notificaciones (persona_id, titulo, mensaje) SELECT id, 'Limpieza Historial', ? FROM personas WHERE tipo_persona = 'Admin'",
            args: [`${adminNombre} eliminó ${total} registros ${nombreTipo}.`]
        });

        res.json({ success: true, message: `Se eliminaron ${total} registros correctamente.` });

    } catch (error: any) {
        console.error("❌ Error en eliminación masiva:", error);
        res.status(500).json({ error: "Error interno", detalle: error.message });
    }
};

// ... (código anterior) ...

// ============================================
// ELIMINAR UNO SOLO (INDIVIDUAL)
// ============================================
export const eliminarSolicitudIndividual = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // 1. Verificar si existe primero (Opcional, pero recomendado)
        const check = await db.execute({
            sql: "SELECT id FROM solicitudes_visitantes WHERE id = ?",
            args: [id]
        });

        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Registro no encontrado" });
        }

        // 2. Ejecutar la eliminación
        await db.execute({
            sql: "DELETE FROM solicitudes_visitantes WHERE id = ?",
            args: [id]
        });

        res.json({ success: true, message: "Registro eliminado correctamente" });

    } catch (error: any) {
        console.error("❌ Error eliminando individual:", error);
        res.status(500).json({ success: false, error: "Error interno al eliminar" });
    }
};