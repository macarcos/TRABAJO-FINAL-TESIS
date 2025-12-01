import { Request, Response } from 'express';
import { db } from '../config/db';

// 1. REGISTRAR UN ACCESO (Facial, RFID o App)
export const registrarAcceso = async (req: Request, res: Response) => {
  const { persona_id, metodo, fecha } = req.body; // ✅ AGREGADO "fecha"
  
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

    // ✅ REGISTRAR ACCESO CON FECHA DEL FRONTEND (SI SE ENVÍA)
    if (fecha) {
      // Si el frontend envía la fecha, usarla
      await db.execute({
        sql: "INSERT INTO accesos (persona_id, metodo, fecha) VALUES (?, ?, ?)",
        args: [persona_id, metodo, fecha]
      });
    } else {
      // Si no, usar CURRENT_TIMESTAMP
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

// 2. OBTENER ÚLTIMOS 10 ACCESOS (Para el Monitor en Vivo)
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

// 3. OBTENER HISTORIAL COMPLETO (Para la Lista de Accesos)
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

// 4. BORRAR TODO EL HISTORIAL (Solo Admin)
export const borrarHistorial = async (req: Request, res: Response) => {
  try {
    // ✅ CONTAR REGISTROS ANTES DE BORRAR
    const conteo = await db.execute('SELECT COUNT(*) as total FROM accesos');
    const totalRegistros = (conteo.rows[0] as any).total;

    // ✅ BORRAR
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
// ✅ NUEVAS FUNCIONES PARA SISTEMA DE ACCESO
// ============================================

// 5. VERIFICAR ACCESO POR RFID (Desde Arduino)
export const verificarAccesoPorRFID = async (req: Request, res: Response) => {
  try {
    const { rfid_code } = req.body;

    if (!rfid_code) {
      return res.status(400).json({ 
        success: false,
        error: 'Se requiere el código RFID' 
      });
    }

    // ✅ BUSCAR PERSONA POR RFID
    const resultado = await db.execute({
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

    if (resultado.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Tarjeta RFID no registrada',
        acceso_autorizado: false
      });
    }

    const persona = resultado.rows[0] as any;

    // ✅ VERIFICAR SI ESTÁ ACTIVO
    if (persona.estado !== 'Activo') {
      return res.status(403).json({ 
        success: false,
        error: 'Usuario inactivo',
        acceso_autorizado: false
      });
    }

    // ✅ REGISTRAR EL ACCESO
    await db.execute({
      sql: "INSERT INTO accesos (persona_id, metodo) VALUES (?, 'RFID Física')",
      args: [persona.id]
    });

    // ✅ RESPUESTA EXITOSA
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
    res.status(500).json({ 
      success: false,
      error: 'Error al verificar acceso' 
    });
  }
};

// 6. OBTENER ESTADÍSTICAS DE ACCESOS
export const obtenerEstadisticas = async (req: Request, res: Response) => {
  try {
    // Total de accesos hoy
    const hoy = await db.execute(`
      SELECT COUNT(*) as total
      FROM accesos
      WHERE DATE(fecha) = DATE('now')
    `);

    // Accesos por método hoy
    const porMetodoHoy = await db.execute(`
      SELECT 
        metodo,
        COUNT(*) as cantidad
      FROM accesos
      WHERE DATE(fecha) = DATE('now')
      GROUP BY metodo
    `);

    // Accesos por tipo de persona hoy
    const porTipoHoy = await db.execute(`
      SELECT 
        p.tipo_persona,
        COUNT(*) as cantidad
      FROM accesos a
      INNER JOIN personas p ON a.persona_id = p.id
      WHERE DATE(a.fecha) = DATE('now')
      GROUP BY p.tipo_persona
    `);

    // Total de accesos en el mes
    const mes = await db.execute(`
      SELECT COUNT(*) as total
      FROM accesos
      WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')
    `);

    res.json({
      success: true,
      estadisticas: {
        hoy: {
          total: (hoy.rows[0] as any).total,
          por_metodo: porMetodoHoy.rows,
          por_tipo_persona: porTipoHoy.rows
        },
        mes: {
          total: (mes.rows[0] as any).total
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener estadísticas' 
    });
  }
};



export const obtenerGraficos = async (req: Request, res: Response) => {
  try {
    // 1. CONTADORES POR ROL
    const total = await db.execute("SELECT COUNT(*) as c FROM personas WHERE tipo_persona != 'Admin'");
    
    // Usamos 'now' y 'localtime' para asegurar que SQLite use la hora del servidor
    const accesosHoy = await db.execute("SELECT COUNT(*) as c FROM accesos WHERE date(fecha) = date('now', 'localtime')");
    
    const estudiantes = await db.execute("SELECT COUNT(*) as c FROM personas WHERE tipo_persona = 'Estudiante' AND estado = 'Activo'");
    const docentes = await db.execute("SELECT COUNT(*) as c FROM personas WHERE tipo_persona = 'Docente' AND estado = 'Activo'");
    const administrativos = await db.execute("SELECT COUNT(*) as c FROM personas WHERE tipo_persona = 'Administrativo' AND estado = 'Activo'");
    const general = await db.execute("SELECT COUNT(*) as c FROM personas WHERE tipo_persona = 'General' AND estado = 'Activo'");

    // 2. ÚLTIMOS MOVIMIENTOS
    const ultimos = await db.execute(`
      SELECT p.primer_nombre, p.primer_apellido, p.tipo_persona, a.metodo, a.fecha
      FROM accesos a JOIN personas p ON a.persona_id = p.id
      ORDER BY a.fecha DESC LIMIT 5
    `);

    // 3. GRÁFICA PERFECTA DE 7 DÍAS
    // Consultamos la cantidad agrupada por fecha
    const rawGrafica = await db.execute(`
      SELECT strftime('%Y-%m-%d', fecha) as dia, COUNT(*) as cantidad
      FROM accesos
      WHERE fecha >= date('now', '-6 days', 'localtime')
      GROUP BY dia
    `);

    // Generamos los últimos 7 días manualmente en JS para asegurar que los días vacíos sean 0
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const graficaFinal = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // Formato YYYY-MM-DD local para comparar con SQL
      const fechaStr = d.toLocaleDateString('en-CA'); // Esto da formato ISO local YYYY-MM-DD
      
      const datoEncontrado = rawGrafica.rows.find((r: any) => r.dia === fechaStr);
      
      graficaFinal.push({
        name: diasSemana[d.getDay()], // Nombre del día (Lun, Mar...)
        fecha: fechaStr,
        accesos: datoEncontrado ? Number(datoEncontrado.cantidad) : 0 // Si no hay dato, es 0
      });
    }

    res.json({
      total: total.rows[0].c,
      hoy: accesosHoy.rows[0].c,
      estudiantes: estudiantes.rows[0].c,
      docentes: docentes.rows[0].c,
      administrativos: administrativos.rows[0].c,
      general: general.rows[0].c,
      recientes: ultimos.rows,
      grafica: graficaFinal
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error stats" });
  }
};