import { Request, Response } from 'express';
import { db } from '../config/db';

// ============================================
// 1. REGISTRAR UN ACCESO (Facial, RFID o App)
// ============================================
export const registrarAcceso = async (req: Request, res: Response) => {
  const { persona_id, metodo, fecha } = req.body; 
  
  try {
    // ✅ VALIDACIONES
    if (!persona_id || !metodo) {
      return res.status(400).json({ 
        error: "Se requiere persona_id y metodo" 
      });
    }

    // ✅ VERIFICAR QUE LA PERSONA EXISTE Y ESTÁ ACTIVA
    const personaExiste = await db.execute({
      sql: `
        SELECT 
          id, 
          primer_nombre, 
          primer_apellido, 
          tipo_persona,
          estado
        FROM personas 
        WHERE id = ?
      `,
      args: [persona_id]
    });

    if (personaExiste.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Persona no encontrada' 
      });
    }

    const persona = personaExiste.rows[0] as any;

    if (persona.estado !== 'Activo') {
      return res.status(403).json({ 
        success: false,
        error: 'Acceso denegado: Usuario inactivo' 
      });
    }

    // ✅ REGISTRAR ACCESO
    if (fecha) {
      await db.execute({
        sql: "INSERT INTO accesos (persona_id, metodo, fecha) VALUES (?, ?, ?)",
        args: [persona_id, metodo, fecha]
      });
    } else {
      await db.execute({
        sql: "INSERT INTO accesos (persona_id, metodo) VALUES (?, ?)",
        args: [persona_id, metodo]
      });
    }

    res.json({ 
      success: true, 
      message: `Acceso registrado - Bienvenido ${persona.primer_nombre} ${persona.primer_apellido}`,
      persona: {
        id: persona.id,
        nombre: `${persona.primer_nombre} ${persona.primer_apellido}`,
        tipo_persona: persona.tipo_persona
      }
    });

  } catch (error) {
    console.error("❌ Error al registrar acceso:", error);
    res.status(500).json({ error: "Error al registrar acceso" });
  }
};

// ============================================
// 2. OBTENER ÚLTIMOS 10 ACCESOS
// ============================================
export const obtenerUltimosAccesos = async (req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT 
        a.id, 
        a.metodo, 
        a.fecha,
        p.id as persona_id,
        p.primer_nombre, 
        p.primer_apellido, 
        p.cedula, 
        p.foto_url, 
        p.tipo_persona
      FROM accesos a
      JOIN personas p ON a.persona_id = p.id
      ORDER BY a.fecha DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      accesos: result.rows
    });

  } catch (error) { 
    console.error("❌ Error historial reciente:", error);
    res.status(500).json({ error: "Error historial reciente" }); 
  }
};

// ============================================
// 3. OBTENER HISTORIAL COMPLETO
// ============================================
export const obtenerHistorialCompleto = async (req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT 
        a.id, 
        a.metodo, 
        a.fecha,
        p.id as persona_id,
        p.primer_nombre, 
        p.primer_apellido, 
        p.cedula, 
        p.foto_url, 
        p.tipo_persona, 
        p.correo
      FROM accesos a
      JOIN personas p ON a.persona_id = p.id
      ORDER BY a.fecha DESC
      LIMIT 1000
    `);

    res.json({
      success: true,
      total: result.rows.length,
      accesos: result.rows
    });

  } catch (error) { 
    console.error("❌ Error historial completo:", error);
    res.status(500).json({ error: "Error historial completo" }); 
  }
};

// ============================================
// 4. BORRAR HISTORIAL
// ============================================
export const borrarHistorial = async (req: Request, res: Response) => {
  try {
    const conteo = await db.execute('SELECT COUNT(*) as total FROM accesos');
    const totalRegistros = (conteo.rows[0] as any).total;

    await db.execute("DELETE FROM accesos");

    res.json({ 
      success: true, 
      message: `Se eliminaron ${totalRegistros} registros del historial`,
      registros_eliminados: totalRegistros
    });

  } catch (error) { 
    console.error("❌ Error al borrar historial:", error);
    res.status(500).json({ error: "Error al borrar" }); 
  }
};

// ============================================
// 5. VERIFICAR ACCESO POR RFID
// ============================================
export const verificarAccesoPorRFID = async (req: Request, res: Response) => {
  try {
    const { rfid_code } = req.body;

    if (!rfid_code) {
      return res.status(400).json({ success: false, error: 'Se requiere el código RFID' });
    }

    const resultado = await db.execute({
      sql: `SELECT id, primer_nombre, primer_apellido, tipo_persona, foto_url, estado FROM personas WHERE rfid_code = ?`,
      args: [rfid_code]
    });

    if (resultado.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tarjeta RFID no registrada', acceso_autorizado: false });
    }

    const persona = resultado.rows[0] as any;

    if (persona.estado !== 'Activo') {
      return res.status(403).json({ success: false, error: 'Usuario inactivo', acceso_autorizado: false });
    }

    await db.execute({
      sql: "INSERT INTO accesos (persona_id, metodo) VALUES (?, 'RFID Física')",
      args: [persona.id]
    });

    res.json({
      success: true,
      acceso_autorizado: true,
      mensaje: `Bienvenido ${persona.primer_nombre} ${persona.primer_apellido}`,
      persona: {
        id: persona.id,
        nombre: `${persona.primer_nombre} ${persona.primer_apellido}`,
        tipo_persona: persona.tipo_persona,
        foto_url: persona.foto_url
      }
    });

  } catch (error: any) {
    console.error('❌ Error verificando acceso RFID:', error);
    res.status(500).json({ success: false, error: 'Error al verificar acceso' });
  }
};

// ============================================
// 6. OBTENER ESTADÍSTICAS SIMPLES
// ============================================
export const obtenerEstadisticas = async (req: Request, res: Response) => {
  try {
    const hoy = await db.execute(`SELECT COUNT(*) as total FROM accesos WHERE DATE(fecha) = DATE('now')`);
    
    const porMetodoHoy = await db.execute(`
      SELECT metodo, COUNT(*) as cantidad FROM accesos WHERE DATE(fecha) = DATE('now') GROUP BY metodo
    `);

    const porTipoHoy = await db.execute(`
      SELECT p.tipo_persona, COUNT(*) as cantidad 
      FROM accesos a INNER JOIN personas p ON a.persona_id = p.id 
      WHERE DATE(a.fecha) = DATE('now') GROUP BY p.tipo_persona
    `);

    const mes = await db.execute(`SELECT COUNT(*) as total FROM accesos WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')`);

    res.json({
      success: true,
      estadisticas: {
        hoy: {
          total: (hoy.rows[0] as any).total,
          por_metodo: porMetodoHoy.rows,
          por_tipo_persona: porTipoHoy.rows
        },
        mes: { total: (mes.rows[0] as any).total }
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
  }
};

// ==========================================================
// 7. OBTENER GRÁFICOS (Semanal y Por Hora)
// ==========================================================
export const obtenerGraficos = async (req: Request, res: Response) => {
  try {
    // ✅ TIPADO SEGURO: Convertimos req.query a string para evitar errores de TS
    const fechaInicio = req.query.fechaInicio as string | undefined;
    const fechaFin = req.query.fechaFin as string | undefined;
    const horaInicio = req.query.horaInicio as string | undefined;
    const horaFin = req.query.horaFin as string | undefined;
    const tipoPersona = req.query.tipoPersona as string | undefined;

    // ✅ CONSTRUIR CONDICIONES WHERE DINÁMICAS (BASE)
    let wherePersonas = "WHERE tipo_persona != 'Admin'";
    let whereAccesos = "WHERE 1=1"; 
    
    if (tipoPersona) {
      wherePersonas += ` AND tipo_persona = '${tipoPersona}'`;
      whereAccesos += ` AND p.tipo_persona = '${tipoPersona}'`;
    }
    if (fechaInicio) {
      whereAccesos += ` AND date(a.fecha) >= date('${fechaInicio}')`;
    }
    if (fechaFin) {
      whereAccesos += ` AND date(a.fecha) <= date('${fechaFin}')`;
    }
    if (horaInicio) {
      whereAccesos += ` AND strftime('%H:%M', a.fecha) >= '${horaInicio}'`;
    }
    if (horaFin) {
      whereAccesos += ` AND strftime('%H:%M', a.fecha) <= '${horaFin}'`;
    }

    // --- 1. CONTADORES GENERALES ---
    const total = await db.execute(`SELECT COUNT(*) as c FROM personas ${wherePersonas}`);
    
    const accesosHoy = await db.execute(`
      SELECT COUNT(*) as c 
      FROM accesos a 
      JOIN personas p ON a.persona_id = p.id
      ${whereAccesos} 
      AND date(a.fecha) = date('now', 'localtime')
    `);
    
    // Contadores por Rol (Helper function)
    const getCountByRole = async (rol: string) => {
      if (tipoPersona && tipoPersona !== rol) return 0;
      const res = await db.execute(`SELECT COUNT(*) as c FROM personas WHERE tipo_persona = '${rol}' AND estado = 'Activo'`);
      return (res.rows[0] as any).c;
    };

    const countEstudiantes = await getCountByRole('Estudiante');
    const countDocentes = await getCountByRole('Docente');
    const countAdmin = await getCountByRole('Administrativo');
    const countGeneral = await getCountByRole('General');

    // --- 2. ÚLTIMOS MOVIMIENTOS ---
    const ultimos = await db.execute(`
      SELECT p.primer_nombre, p.primer_apellido, p.tipo_persona, a.metodo, a.fecha
      FROM accesos a 
      JOIN personas p ON a.persona_id = p.id
      ${whereAccesos}
      ORDER BY a.fecha DESC LIMIT 10
    `);

    // --- 3. GRÁFICA SEMANAL (Últimos 7 días) ---
    const rawGraficaSemanal = await db.execute(`
      SELECT strftime('%Y-%m-%d', a.fecha) as dia, COUNT(*) as cantidad
      FROM accesos a
      JOIN personas p ON a.persona_id = p.id
      ${whereAccesos}
      AND a.fecha >= date('now', '-6 days', 'localtime')
      GROUP BY dia
    `);

    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const graficaSemanalFinal = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const fechaStr = d.toLocaleDateString('en-CA');
      // Uso de 'as any[]' para evitar errores de tipo al buscar
      const dato = (rawGraficaSemanal.rows as any[]).find((r: any) => r.dia === fechaStr);
      graficaSemanalFinal.push({
        name: diasSemana[d.getDay()],
        fecha: fechaStr,
        accesos: dato ? Number(dato.cantidad) : 0
      });
    }

    // --- 4. ✅ GRÁFICA POR HORA (Para el día seleccionado) ---
    // Si el usuario envió fechaInicio, usamos esa fecha. Si no, usamos HOY.
    const fechaParaHoras = fechaInicio ? fechaInicio : new Date().toISOString().split('T')[0];
    
    // Consulta SQL agrupada por hora (00 - 23)
    const rawGraficaHoras = await db.execute({
      sql: `
        SELECT strftime('%H', a.fecha) as hora, COUNT(*) as cantidad
        FROM accesos a
        JOIN personas p ON a.persona_id = p.id
        WHERE date(a.fecha) = date(?)
        ${tipoPersona ? `AND p.tipo_persona = '${tipoPersona}'` : ''}
        GROUP BY hora
        ORDER BY hora ASC
      `,
      args: [fechaParaHoras]
    });

    // Rellenar las 24 horas (Si no hay datos a las 3am, ponemos 0)
    const graficaHorasFinal = Array.from({ length: 24 }, (_, i) => {
      const horaStr = i.toString().padStart(2, '0'); // "00", "01", ... "23"
      // Uso de 'as any[]' para evitar errores de tipo al buscar
      const datoEncontrado = (rawGraficaHoras.rows as any[]).find((r: any) => r.hora === horaStr);
      
      return {
        hora: `${horaStr}:00`,
        cantidad: datoEncontrado ? Number(datoEncontrado.cantidad) : 0
      };
    });

    res.json({
      total: (total.rows[0] as any).c,
      hoy: (accesosHoy.rows[0] as any).c,
      estudiantes: countEstudiantes,
      docentes: countDocentes,
      administrativos: countAdmin,
      general: countGeneral,
      recientes: ultimos.rows,
      grafica: graficaSemanalFinal,     
      graficaPorHora: graficaHorasFinal 
    });

  } catch (error) {
    console.error('❌ Error en obtenerGraficos:', error);
    res.status(500).json({ error: "Error obteniendo estadísticas" });
  }
};