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
    
    // Validar si el rostro está habilitado (Solo para usuarios regulares)
    if (metodo === 'Reconocimiento Facial' && tipo_usuario !== 'Visitante') {
       const check = await db.execute("SELECT rostro_habilitado FROM personas WHERE id = ?", [usuario_id]);
       if (check.rows.length > 0 && !check.rows[0].rostro_habilitado) {
           return res.status(200).json({ success: false, error: "Reconocimiento Facial Deshabilitado" });
       }
    }

    let personaId: number | null = null;
    let visitanteId: number | null = null;
    let nombreUsuario = "Usuario";

    // 🔥 CORRECCIÓN AQUÍ: Separar lógica de Visitante vs Usuario
    if (tipo_usuario === 'Visitante') {
        // ES UN VISITANTE
        visitanteId = Number(usuario_id);
        const vCheck = await db.execute("SELECT primer_nombre FROM solicitudes_visitantes WHERE id = ?", [visitanteId]);
        if (vCheck.rows.length > 0) nombreUsuario = (vCheck.rows[0] as any).primer_nombre;
    
    } else {
        // ES UN USUARIO REGULAR (Estudiante, Admin, etc.)
        personaId = Number(usuario_id);
        const pCheck = await db.execute("SELECT primer_nombre FROM personas WHERE id = ?", [personaId]);
        if (pCheck.rows.length > 0) nombreUsuario = (pCheck.rows[0] as any).primer_nombre;
    }

    const fechaRegistro = getFechaEcuador();
    
    // Insertamos respetando las columnas correctas (visitante_id o persona_id)
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
    // 🔥 CORRECCIÓN: Usamos COALESCE para traer datos de la tabla correcta
    const result = await db.execute(`
      SELECT 
        a.id, 
        a.metodo, 
        a.fecha, 
        a.confianza_facial, 
        a.foto_verificacion_base64,
        
        COALESCE(p.primer_nombre, v.primer_nombre, 'Desconocido') as primer_nombre,
        COALESCE(p.primer_apellido, v.primer_apellido, '') as primer_apellido,
        COALESCE(p.cedula, v.cedula, '---') as cedula,
        COALESCE(p.foto_url, v.foto_base64) as foto_url, 
        
        CASE 
           WHEN a.visitante_id IS NOT NULL THEN 'Visitante'
           ELSE p.tipo_persona 
        END as tipo_persona

      FROM accesos a
      LEFT JOIN personas p ON a.persona_id = p.id
      LEFT JOIN solicitudes_visitantes v ON a.visitante_id = v.id
      ORDER BY a.fecha DESC LIMIT 20
    `);
    res.json({ success: true, accesos: result.rows });
  } catch (e) { res.status(500).json({ error: "Error historial" }); }
};

// ============================================
// 🔥 OBTENER HISTORIAL COMPLETO (PÁGINA HISTORIAL)
// ============================================
export const obtenerHistorialCompleto = async (req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT 
        a.id, 
        a.metodo, 
        a.fecha, 
        a.confianza_facial, 
        a.foto_verificacion_base64,
        
        -- DATOS DEL USUARIO O VISITANTE
        COALESCE(p.primer_nombre, v.primer_nombre, 'Desconocido') as primer_nombre,
        COALESCE(p.primer_apellido, v.primer_apellido, '') as primer_apellido,
        COALESCE(p.cedula, v.cedula, '---') as cedula,
        COALESCE(p.correo, v.correo, '') as correo,
        COALESCE(p.foto_url, v.foto_base64) as foto_url,
        
        CASE 
          WHEN a.visitante_id IS NOT NULL THEN 'Visitante'
          ELSE p.tipo_persona 
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

export const obtenerGraficos = async (req: Request, res: Response) => {
  try {
    const { fechaInicio, fechaFin, horaInicio, horaFin, tipoPersona } = req.query;
    
    const fechaEc = getFechaEcuador();
    const hoySQL = fechaEc.split(' ')[0]; // YYYY-MM-DD
    
    // 1. CONSTRUCCIÓN DEL FILTRO (WHERE)
    let whereBase = "WHERE 1=1"; 
    
    // Fechas por defecto si no envían nada
    const startString = (fechaInicio as string) || hoySQL;
    const endString = (fechaFin as string) || hoySQL;

    if (fechaInicio) whereBase += ` AND date(a.fecha) >= date('${fechaInicio}')`;
    if (fechaFin) whereBase += ` AND date(a.fecha) <= date('${fechaFin}')`;
    
    if (horaInicio) whereBase += ` AND strftime('%H:%M', a.fecha) >= '${horaInicio}'`;
    if (horaFin) whereBase += ` AND strftime('%H:%M', a.fecha) <= '${horaFin}'`;

    if (tipoPersona) {
      if (tipoPersona === 'Visitante' || tipoPersona === 'General') {
          whereBase += ` AND a.visitante_id IS NOT NULL`;
      } else {
          whereBase += ` AND p.tipo_persona = '${tipoPersona}'`;
      }
    }

    // 2. CONTEOS Y KPIs (Queries)
    const totalRes = await db.execute({
        sql: `SELECT COUNT(*) as c FROM accesos a LEFT JOIN personas p ON a.persona_id = p.id LEFT JOIN solicitudes_visitantes v ON a.visitante_id = v.id ${whereBase}`,
        args: []
    });
    const totalAccesosFiltrados = Number(totalRes.rows[0]?.c) || 0;

    const rolesRes = await db.execute({
        sql: `SELECT 
                SUM(CASE WHEN p.tipo_persona = 'Estudiante' THEN 1 ELSE 0 END) as est,
                SUM(CASE WHEN p.tipo_persona = 'Docente' THEN 1 ELSE 0 END) as doc,
                SUM(CASE WHEN p.tipo_persona = 'Administrativo' THEN 1 ELSE 0 END) as adm,
                SUM(CASE WHEN a.visitante_id IS NOT NULL THEN 1 ELSE 0 END) as vis
              FROM accesos a 
              LEFT JOIN personas p ON a.persona_id = p.id 
              LEFT JOIN solicitudes_visitantes v ON a.visitante_id = v.id
              ${whereBase}`,
        args: []
    });
    const counts = rolesRes.rows[0] as any;

    const ultimos = await db.execute(`
      SELECT 
        COALESCE(p.primer_nombre, v.primer_nombre, 'Desconocido') as primer_nombre, 
        COALESCE(p.primer_apellido, v.primer_apellido, '') as primer_apellido,
        CASE WHEN a.visitante_id IS NOT NULL THEN 'Visitante' ELSE p.tipo_persona END as tipo_persona,
        a.metodo, a.fecha 
      FROM accesos a 
      LEFT JOIN personas p ON a.persona_id = p.id 
      LEFT JOIN solicitudes_visitantes v ON a.visitante_id = v.id
      ${whereBase} 
      ORDER BY a.fecha DESC LIMIT 10
    `);

    // =========================================================================
    // 🔥 3. CORRECCIÓN DE FECHAS (ZONA HORARIA) PARA LA GRÁFICA
    // =========================================================================
    
    // Función para crear fecha al MEDIODÍA (12:00) y evitar saltos de día por Timezone
    const crearFechaSegura = (fechaStr: string) => {
        const [anio, mes, dia] = fechaStr.split('-').map(Number);
        return new Date(anio, mes - 1, dia, 12, 0, 0); 
    };

    const dInicio = crearFechaSegura(startString);
    const dFin = crearFechaSegura(endString);
    
    // Si no hay filtro, mostrar últimos 7 días
    if (!fechaInicio) dInicio.setDate(dFin.getDate() - 6);

    const diffTime = Math.abs(dFin.getTime() - dInicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    let sqlFormat = '';
    let stepType: 'day' | 'month' | 'year' = 'day';

    if (diffDays <= 60) {
        sqlFormat = '%Y-%m-%d'; 
        stepType = 'day';
    } else if (diffDays <= 730) {
        sqlFormat = '%Y-%m'; 
        stepType = 'month';
    } else {
        sqlFormat = '%Y'; 
        stepType = 'year';
    }

    const rawGrafica = await db.execute(`
      SELECT strftime('${sqlFormat}', a.fecha) as periodo, COUNT(*) as cantidad 
      FROM accesos a
      LEFT JOIN personas p ON a.persona_id = p.id 
      LEFT JOIN solicitudes_visitantes v ON a.visitante_id = v.id
      ${whereBase} 
      GROUP BY periodo ORDER BY periodo ASC
    `);

    // 🧠 Rellenar huecos con 0 (Usando fechas seguras)
    const graficaFinal = [];
    let current = new Date(dInicio); // Empieza en la fecha exacta a las 12:00 PM

    // Bucle seguro comparando timestamps para incluir el último día
    while (current.getTime() <= dFin.getTime()) { 
        let labelDB = "";
        let labelVisual = "";
        
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');

        if (stepType === 'day') {
            labelDB = `${y}-${m}-${d}`;
            labelVisual = `${d}/${m}`;
            current.setDate(current.getDate() + 1); // Avanza 1 día
        } else if (stepType === 'month') {
            labelDB = `${y}-${m}`;
            const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            labelVisual = `${months[current.getMonth()]} ${y}`;
            current.setMonth(current.getMonth() + 1); // Avanza 1 mes
        } else {
            labelDB = String(y);
            labelVisual = String(y);
            current.setFullYear(current.getFullYear() + 1); // Avanza 1 año
        }

        const dato = (rawGrafica.rows as any[]).find((r: any) => r.periodo === labelDB);
        graficaFinal.push({ name: labelVisual, accesos: dato ? Number(dato.cantidad) : 0 });
    }

    // 4. GRÁFICO POR HORA
    const rawGraficaHoras = await db.execute({
      sql: `SELECT strftime('%H', a.fecha) as hora, COUNT(*) as cantidad 
            FROM accesos a 
            LEFT JOIN personas p ON a.persona_id = p.id 
            LEFT JOIN solicitudes_visitantes v ON a.visitante_id = v.id
            ${whereBase} GROUP BY hora ORDER BY hora ASC`,
      args: []
    });

    const graficaHorasFinal = Array.from({ length: 24 }, (_, i) => {
      const horaStr = i.toString().padStart(2, '0');
      const datoEncontrado = (rawGraficaHoras.rows as any[]).find((r: any) => r.hora === horaStr);
      return { hora: `${horaStr}:00`, cantidad: datoEncontrado ? Number(datoEncontrado.cantidad) : 0 };
    });

    const totalPersonasRes = await db.execute(`SELECT COUNT(*) as c FROM personas WHERE tipo_persona != 'Admin'`);
    const totalVisitantesRes = await db.execute(`SELECT COUNT(*) as c FROM solicitudes_visitantes WHERE estado = 'Aprobado'`);
    const totalGlobal = (Number(totalPersonasRes.rows[0]?.c) || 0) + (Number(totalVisitantesRes.rows[0]?.c) || 0);

    res.json({
      total: totalGlobal, 
      total_accesos: totalAccesosFiltrados, 
      total_visitantes: Number(counts.vis) || 0,
      estudiantes: Number(counts.est) || 0,
      docentes: Number(counts.doc) || 0,
      administrativos: Number(counts.adm) || 0,
      general: Number(counts.vis) || 0,
      recientes: ultimos.rows,
      grafica: graficaFinal, 
      graficaPorHora: graficaHorasFinal
    });

  } catch (error) { 
      console.error("Error Dashboard:", error);
      res.status(500).json({ error: "Error obteniendo estadísticas" }); 
  }
};

