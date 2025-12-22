import { Request, Response } from 'express';
import { db } from '../config/db';

// ============================================
// 🛠️ FUNCIÓN AUXILIAR: HORA ECUADOR (UTC-5)
// ============================================
const getFechaEcuador = (): string => {
  const ahora = new Date();
  const fechaEcuador = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
  
  const año = fechaEcuador.getFullYear();
  const mes = String(fechaEcuador.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaEcuador.getDate()).padStart(2, '0');
  const hora = String(fechaEcuador.getHours()).padStart(2, '0');
  const min = String(fechaEcuador.getMinutes()).padStart(2, '0');
  const seg = String(fechaEcuador.getSeconds()).padStart(2, '0');

  return `${año}-${mes}-${dia} ${hora}:${min}:${seg}`;
};

// ============================================
// ✨ VALIDAR RFID 
// ============================================
export const validarRFID = async (req: Request, res: Response) => {
  try {
    const { codigo } = req.body;

    if (!codigo || codigo.trim().length < 4) {
      return res.status(200).json({ success: false, error: "Código inválido" });
    }

    const codigoLimpio = codigo.trim().toUpperCase();
    
    // 1. BUSCAR EN BD
    const resultado = await db.execute({
      sql: `
        SELECT * FROM personas
        WHERE (UPPER(rfid_code) = ? OR UPPER(seeb_billetera) = ?)
        AND estado = 'Activo'
        LIMIT 1
      `,
      args: [codigoLimpio, codigoLimpio]
    });

    if (resultado.rows.length === 0) {
      return res.status(200).json({ success: false, error: "Código no registrado" });
    }

    const persona = resultado.rows[0] as any;

    // 2. VERIFICAR SI ESTÁ HABILITADO
    const esRFIDFisico = (persona.rfid_code || '').toUpperCase() === codigoLimpio;
    const esRFIDVirtual = (persona.seeb_billetera || '').toUpperCase() === codigoLimpio;

    if (esRFIDFisico && !persona.rfid_fisico_habilitado) {
       return res.status(200).json({ success: false, error: "Credencial Física Deshabilitada" });
    }

    if (esRFIDVirtual && !persona.rfid_virtual_habilitado) {
       return res.status(200).json({ success: false, error: "Credencial Virtual Deshabilitada" });
    }

    // 3. REGISTRAR ACCESO
    const fechaEc = getFechaEcuador();
    const tipoMetodo = esRFIDVirtual ? 'RFID Virtual' : 'RFID Físico';

    await db.execute({
      sql: `INSERT INTO accesos (persona_id, metodo, fecha, confianza_facial) VALUES (?, ?, ?, 100)`,
      args: [persona.id, tipoMetodo, fechaEc]
    });

    return res.json({
      success: true,
      persona: {
        id: persona.id,
        primer_nombre: persona.primer_nombre,
        primer_apellido: persona.primer_apellido,
        tipo_persona: persona.tipo_persona,
        estado: persona.estado
      },
      metodo: tipoMetodo,
      mensaje: `✅ Bienvenido ${persona.primer_nombre}`
    });

  } catch (error) {
    console.error("❌ Error RFID:", error);
    return res.status(200).json({ success: false, error: "Error interno" });
  }
};

// ============================================
// ✨ REGISTRAR ACCESO (FACIAL U OTROS)
// ============================================
export const registrarAcceso = async (req: Request, res: Response) => {
  try {
    const { usuario_id, tipo_usuario, metodo, foto_verificacion_base64, confianza_facial } = req.body; 
    
    // Validar si el rostro está habilitado
    if (metodo === 'Reconocimiento Facial' && tipo_usuario !== 'Visitante') {
       const check = await db.execute("SELECT rostro_habilitado FROM personas WHERE id = ?", [usuario_id]);
       if (check.rows.length > 0 && !check.rows[0].rostro_habilitado) {
           return res.status(200).json({ success: false, error: "Reconocimiento Facial Deshabilitado" });
       }
    }

    let personaId: number | null = null;
    let visitanteId: number | null = null;
    let nombreUsuario = "Usuario";

    if (tipo_usuario === 'Estudiante' || tipo_usuario === 'Docente' || tipo_usuario === 'Administrativo' || tipo_usuario === 'Admin') {
      personaId = Number(usuario_id);
      const pCheck = await db.execute("SELECT primer_nombre FROM personas WHERE id = ?", [personaId]);
      if (pCheck.rows.length > 0) nombreUsuario = (pCheck.rows[0] as any).primer_nombre;
    } else if (tipo_usuario === 'General') {
      // 🔥 Los visitantes aprobados son de tipo 'General' en la tabla personas
      personaId = Number(usuario_id);
      const pCheck = await db.execute("SELECT primer_nombre FROM personas WHERE id = ? AND tipo_persona = 'General'", [personaId]);
      if (pCheck.rows.length > 0) nombreUsuario = (pCheck.rows[0] as any).primer_nombre;
    }

    const fechaRegistro = getFechaEcuador();
    await db.execute({
      sql: `INSERT INTO accesos (persona_id, visitante_id, metodo, fecha, foto_verificacion_base64, confianza_facial) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [personaId, visitanteId, metodo, fechaRegistro, foto_verificacion_base64 || null, confianza_facial || null]
    });

    res.json({ success: true, message: `Bienvenido ${nombreUsuario}`, fecha: fechaRegistro });
  } catch (error) {
    console.error("❌ Error registro:", error);
    res.status(500).json({ error: "Error interno" });
  }
};

// ============================================
// 4. BORRAR HISTORIAL
// ============================================
export const borrarHistorial = async (req: Request, res: Response) => {
  try {
    const { adminName } = req.query;
    const conteo = await db.execute('SELECT COUNT(*) as total FROM accesos');
    const totalRegistros = ((conteo.rows[0] as any) || {}).total || 0;

    if (totalRegistros === 0) {
        return res.json({ success: false, message: "No hay historial para borrar" });
    }

    await db.execute("DELETE FROM accesos");

    const admins = await db.execute("SELECT id FROM personas WHERE tipo_persona = 'Admin'");
    
    if (admins.rows.length > 0) {
        const titulo = "⚠️ Historial Eliminado";
        const mensaje = `El Admin "${adminName || 'Sistema'}" borró todo el historial (${totalRegistros} registros eliminados).`;
        
        for (const admin of admins.rows) {
            await db.execute({
                sql: `INSERT INTO notificaciones (persona_id, titulo, mensaje, fecha) VALUES (?, ?, ?, datetime('now', 'localtime'))`,
                args: [(admin as any).id, titulo, mensaje]
            });
        }
    }

    res.json({ success: true, message: `Historial eliminado`, registros_eliminados: totalRegistros });
  } catch (error: any) { 
    console.error("Error borrar:", error);
    res.status(500).json({ error: "Error al borrar", detalle: error.message }); 
  }
};

// ============================================
// 🔥 OBTENER ÚLTIMOS ACCESOS (PARA MONITOR)
// ============================================
export const obtenerUltimosAccesos = async (req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT a.id, a.metodo, a.fecha, a.confianza_facial, a.foto_verificacion_base64,
      COALESCE(p.primer_nombre, v.primer_nombre) as primer_nombre,
      COALESCE(p.primer_apellido, v.primer_apellido) as primer_apellido,
      COALESCE(p.cedula, v.cedula) as cedula,
      COALESCE(p.foto_url, v.foto_base64) as foto_url, 
      CASE WHEN p.id IS NOT NULL THEN p.tipo_persona ELSE 'General' END as tipo_persona
      FROM accesos a
      LEFT JOIN personas p ON a.persona_id = p.id
      LEFT JOIN solicitudes_visitantes v ON a.visitante_id = v.id
      ORDER BY a.fecha DESC LIMIT 10
    `);
    res.json({ success: true, accesos: result.rows });
  } catch (e) { res.status(500).json({ error: "Error historial" }); }
};

// ============================================
// 🔥 OBTENER HISTORIAL COMPLETO (PÁGINA HISTORIAL) - CORREGIDO
// ============================================
export const obtenerHistorialCompleto = async (req: Request, res: Response) => {
  try {
    // 🔥 QUERY MEJORADA: Maneja mejor los visitantes (tipo_persona = 'General')
    const result = await db.execute(`
      SELECT 
        a.id, 
        a.metodo, 
        a.fecha, 
        a.confianza_facial, 
        a.foto_verificacion_base64,
        -- Si hay persona_id, obtén datos de personas; si hay visitante_id, obtén de solicitudes_visitantes
        CASE 
          WHEN a.persona_id IS NOT NULL THEN p.primer_nombre 
          ELSE v.primer_nombre 
        END as primer_nombre,
        CASE 
          WHEN a.persona_id IS NOT NULL THEN p.primer_apellido 
          ELSE v.primer_apellido 
        END as primer_apellido,
        CASE 
          WHEN a.persona_id IS NOT NULL THEN p.cedula 
          ELSE v.cedula 
        END as cedula,
        CASE 
          WHEN a.persona_id IS NOT NULL THEN p.correo 
          ELSE v.correo 
        END as correo,
        CASE 
          WHEN a.persona_id IS NOT NULL THEN p.foto_url 
          ELSE v.foto_base64 
        END as foto_url,
        CASE 
          WHEN a.persona_id IS NOT NULL THEN p.tipo_persona 
          ELSE 'General'  -- Visitantes se muestran como 'General' (Visitante)
        END as tipo_persona
      FROM accesos a
      LEFT JOIN personas p ON a.persona_id = p.id
      LEFT JOIN solicitudes_visitantes v ON a.visitante_id = v.id
      ORDER BY a.fecha DESC 
      LIMIT 1000
    `);

    console.log("✅ Historial obtenido:", result.rows.length, "registros");
    
    res.json({ success: true, total: result.rows.length, accesos: result.rows });
  } catch (error) { 
    console.error("❌ Error historial completo:", error);
    res.status(500).json({ error: "Error historial completo" }); 
  }
};

// ============================================
// VERIFICAR ACCESO POR RFID (EXTRA)
// ============================================
export const verificarAccesoPorRFID = async (req: Request, res: Response) => {
  try {
    const { rfid_code } = req.body;
    if (!rfid_code) return res.status(200).json({ success: false, error: 'Falta código' });

    const codigoLimpio = rfid_code.trim().toUpperCase();
    const resultado = await db.execute({
      sql: `SELECT * FROM personas WHERE (rfid_code = ? OR seeb_billetera = ?) AND estado = 'Activo' LIMIT 1`,
      args: [codigoLimpio, codigoLimpio]
    });

    if (resultado.rows.length === 0) return res.status(200).json({ success: false, error: 'No registrado' });

    const persona = resultado.rows[0] as any;
    
    const esRFIDFisico = (persona.rfid_code || '').toUpperCase() === codigoLimpio;
    const esRFIDVirtual = (persona.seeb_billetera || '').toUpperCase() === codigoLimpio;
    if (esRFIDFisico && !persona.rfid_fisico_habilitado) return res.status(200).json({ success: false, error: "Deshabilitado" });
    if (esRFIDVirtual && !persona.rfid_virtual_habilitado) return res.status(200).json({ success: false, error: "Deshabilitado" });

    const fechaEc = getFechaEcuador();
    const tipoMetodo = (persona.seeb_billetera === codigoLimpio) ? 'RFID Virtual' : 'RFID Físico';

    await db.execute({
      sql: "INSERT INTO accesos (persona_id, metodo, fecha) VALUES (?, ?, ?)",
      args: [persona.id, tipoMetodo, fechaEc]
    });

    res.json({ success: true, acceso_autorizado: true, mensaje: `Bienvenido ${persona.primer_nombre}`, persona });
  } catch (error: any) { res.status(500).json({ success: false, error: 'Error interno' }); }
};

// ============================================
// ESTADISTICAS
// ============================================
export const obtenerEstadisticas = async (req: Request, res: Response) => {
  try {
    const fechaEc = getFechaEcuador();
    const hoySQL = fechaEc.split(' ')[0];
    const mesSQL = hoySQL.substring(0, 7);
    const hoy = await db.execute({ sql: `SELECT COUNT(*) as total FROM accesos WHERE date(fecha) = ?`, args: [hoySQL] });
    const porMetodoHoy = await db.execute({ sql: `SELECT metodo, COUNT(*) as cantidad FROM accesos WHERE date(fecha) = ? GROUP BY metodo`, args: [hoySQL] });
    const mes = await db.execute({ sql: `SELECT COUNT(*) as total FROM accesos WHERE strftime('%Y-%m', fecha) = ?`, args: [mesSQL] });
    res.json({ success: true, estadisticas: { hoy: { total: ((hoy.rows[0] as any) || {}).total || 0, por_metodo: porMetodoHoy.rows }, mes: { total: ((mes.rows[0] as any) || {}).total || 0 } } });
  } catch (error: any) { res.status(500).json({ success: false, error: 'Error estadisticas' }); }
};

// ============================================
// 🔥 GRÁFICOS (PARA EL DASHBOARD)
// ============================================
export const obtenerGraficos = async (req: Request, res: Response) => {
  try {
    const { fechaInicio, fechaFin, horaInicio, horaFin, tipoPersona } = req.query;
    const fechaEc = getFechaEcuador();
    const hoySQL = fechaEc.split(' ')[0];
    let whereAccesos = "WHERE 1=1"; 
    
    if (fechaInicio) whereAccesos += ` AND date(a.fecha) >= date('${fechaInicio}')`;
    if (fechaFin) whereAccesos += ` AND date(a.fecha) <= date('${fechaFin}')`;
    if (horaInicio) whereAccesos += ` AND strftime('%H:%M', a.fecha) >= '${horaInicio}'`;
    if (horaFin) whereAccesos += ` AND strftime('%H:%M', a.fecha) <= '${horaFin}'`;

    if (tipoPersona) {
      if (tipoPersona === 'General') whereAccesos += ` AND p.tipo_persona = 'General'`;
      else whereAccesos += ` AND p.tipo_persona = '${tipoPersona}'`;
    }

    const total = await db.execute(`SELECT COUNT(*) as c FROM personas WHERE tipo_persona != 'Admin'`);
    const accesosHoy = await db.execute({ sql: `SELECT COUNT(*) as c FROM accesos a WHERE date(a.fecha) = ?`, args: [hoySQL] });

    const getCountByRole = async (rol: string) => {
      const res = await db.execute(`SELECT COUNT(*) as c FROM personas WHERE tipo_persona = '${rol}' AND estado = 'Activo'`);
      return ((res.rows[0] as any) || {}).c || 0;
    };

    const [countEst, countDoc, countAdm, countGen] = await Promise.all([
        getCountByRole('Estudiante'), getCountByRole('Docente'), getCountByRole('Administrativo'), getCountByRole('General')
    ]);

    const ultimos = await db.execute(`
      SELECT 
        CASE WHEN a.persona_id IS NOT NULL THEN p.primer_nombre ELSE v.primer_nombre END as primer_nombre, 
        CASE WHEN a.persona_id IS NOT NULL THEN p.primer_apellido ELSE v.primer_apellido END as primer_apellido,
        CASE WHEN a.persona_id IS NOT NULL THEN p.cedula ELSE v.cedula END as cedula,
        CASE WHEN a.persona_id IS NOT NULL THEN p.tipo_persona ELSE 'General' END as tipo_persona,
        CASE WHEN a.persona_id IS NOT NULL THEN p.foto_url ELSE v.foto_base64 END as foto_url, 
        a.metodo, a.fecha 
      FROM accesos a 
      LEFT JOIN personas p ON a.persona_id = p.id 
      LEFT JOIN solicitudes_visitantes v ON a.visitante_id = v.id
      ${whereAccesos} 
      ORDER BY a.fecha DESC 
      LIMIT 10
    `);

    const rawGraficaSemanal = await db.execute(`
      SELECT strftime('%Y-%m-%d', a.fecha) as dia, COUNT(*) as cantidad FROM accesos a
      LEFT JOIN personas p ON a.persona_id = p.id 
      LEFT JOIN solicitudes_visitantes v ON a.visitante_id = v.id
      ${whereAccesos} AND a.fecha >= date('${hoySQL}', '-6 days') 
      GROUP BY dia
    `);

    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const graficaSemanalFinal = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(new Date().setDate(new Date().getDate() - i));
      const fechaStr = d.toISOString().split('T')[0];
      const dato = (rawGraficaSemanal.rows as any[]).find((r: any) => r.dia === fechaStr);
      graficaSemanalFinal.push({ name: diasSemana[d.getDay()], fecha: fechaStr, accesos: dato ? Number(dato.cantidad) : 0 });
    }

    const fechaParaHoras = (fechaInicio as string) || hoySQL;
    const rawGraficaHoras = await db.execute({
      sql: `SELECT strftime('%H', a.fecha) as hora, COUNT(*) as cantidad FROM accesos a
        LEFT JOIN personas p ON a.persona_id = p.id 
        LEFT JOIN solicitudes_visitantes v ON a.visitante_id = v.id
        WHERE date(a.fecha) = date(?) ${tipoPersona === 'General' ? "AND p.tipo_persona = 'General'" : (tipoPersona ? `AND p.tipo_persona = '${tipoPersona}'` : "")}
        GROUP BY hora ORDER BY hora ASC`,
      args: [fechaParaHoras]
    });

    const graficaHorasFinal = Array.from({ length: 24 }, (_, i) => {
      const horaStr = i.toString().padStart(2, '0');
      const datoEncontrado = (rawGraficaHoras.rows as any[]).find((r: any) => r.hora === horaStr);
      return { hora: `${horaStr}:00`, cantidad: datoEncontrado ? Number(datoEncontrado.cantidad) : 0 };
    });

    res.json({
      total: ((total.rows[0] as any) || {}).c || 0, hoy: ((accesosHoy.rows[0] as any) || {}).c || 0,
      estudiantes: countEst, docentes: countDoc, administrativos: countAdm, general: countGen,
      recientes: ultimos.rows, grafica: graficaSemanalFinal, graficaPorHora: graficaHorasFinal 
    });
  } catch (error) { res.status(500).json({ error: "Error obteniendo estadísticas" }); }
};