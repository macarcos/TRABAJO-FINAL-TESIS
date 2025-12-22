import { Request, Response } from 'express';
import { db } from '../config/db';

// ============================================
// 1. OBTENER PERÍODOS DISPONIBLES
// ============================================
export const obtenerPeriodsDisponibles = async (req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT 
        id,
        nombre,
        fecha_inicio,
        fecha_fin,
        estado
      FROM periodos
      WHERE estado = 'Activo'
      ORDER BY fecha_inicio DESC
    `);

    res.json({
      success: true,
      periodos: result.rows
    });

  } catch (error) {
    console.error('❌ Error obteniendo periodos:', error);
    res.status(500).json({ error: "Error al obtener periodos" });
  }
};

// ============================================
// 2. ACEPTAR MATRÍCULA ✅ GENERAR NFC
// ============================================
export const aceptarMatricula = async (req: Request, res: Response) => {
  const { persona_id, periodo_id } = req.body;

  try {
    // ✅ VALIDACIÓN
    if (!persona_id || !periodo_id) {
      return res.status(400).json({ 
        error: "Se requiere persona_id y periodo_id" 
      });
    }

    // ✅ VERIFICAR QUE LA PERSONA ES ESTUDIANTE
    const personaResult = await db.execute({
      sql: "SELECT id, tipo_persona, seeb_billetera FROM personas WHERE id = ?",
      args: [persona_id]
    });

    if (personaResult.rows.length === 0) {
      return res.status(404).json({ error: "Persona no encontrada" });
    }

    const persona = personaResult.rows[0] as any;

    if (persona.tipo_persona !== 'Estudiante') {
      return res.status(403).json({ error: "Solo estudiantes pueden aceptar matrícula" });
    }

    // ✅ VERIFICAR QUE EL PERIODO EXISTE
    const periodoResult = await db.execute({
      sql: "SELECT id FROM periodos WHERE id = ? AND estado = 'Activo'",
      args: [periodo_id]
    });

    if (periodoResult.rows.length === 0) {
      return res.status(404).json({ error: "Periodo no encontrado o inactivo" });
    }

    // ✅ VERIFICAR SI YA ACEPTÓ MATRÍCULA EN ESTE PERIODO
    const matriculaExistente = await db.execute({
      sql: "SELECT id FROM matriculas WHERE persona_id = ? AND periodo_id = ?",
      args: [persona_id, periodo_id]
    });

    if (matriculaExistente.rows.length > 0) {
      return res.status(400).json({ error: "Ya has aceptado matrícula en este periodo" });
    }

    // ✅ GENERAR seeb_billetera SI NO EXISTE
    let seebBilletera = persona.seeb_billetera;
    
    if (!seebBilletera || seebBilletera === null) {
      // ✅ GENERAR CÓDIGO ALFANUMÉRICO DE 8 CARACTERES
      const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      seebBilletera = '';
      for (let i = 0; i < 8; i++) {
        seebBilletera += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
      }
      
      console.log(`📱 Generando seeb_billetera para estudiante ${persona_id}: ${seebBilletera}`);
      
      // ✅ ACTUALIZAR PERSONA CON seeb_billetera Y HABILITAR RFID VIRTUAL
      await db.execute({
        sql: "UPDATE personas SET seeb_billetera = ?, rfid_virtual_habilitado = 1 WHERE id = ?",
        args: [seebBilletera, persona_id]
      });
      
      console.log(`✅ seeb_billetera Generado y guardado en BD para ${persona_id}`);
    }

    // ✅ REGISTRAR MATRÍCULA
    const resultado = await db.execute({
      sql: `INSERT INTO matriculas (persona_id, periodo_id, estado, fecha_aceptacion)
            VALUES (?, ?, 'Activa', CURRENT_TIMESTAMP)`,
      args: [persona_id, periodo_id]
    });

    // ✅ ACTUALIZAR FLAG DE MATRÍCULA ACEPTADA
    await db.execute({
      sql: "UPDATE personas SET matricula_aceptada = 1 WHERE id = ?",
      args: [persona_id]
    });

    console.log(`✅ Matrícula aceptada - Estudiante ${persona_id}, seeb_billetera: ${seebBilletera}`);

    res.json({
      success: true,
      message: "✅ Matrícula aceptada correctamente",
      matricula: {
        id: Number(resultado.lastInsertRowid),
        persona_id,
        periodo_id,
        seeb_billetera: seebBilletera,
        rfid_virtual_habilitado: 1,
        fecha_aceptacion: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error aceptando matrícula:', error);
    res.status(500).json({ error: "Error al aceptar matrícula" });
  }
};

// ============================================
// 3. RECHAZAR MATRÍCULA
// ============================================
export const rechazarMatricula = async (req: Request, res: Response) => {
  const { persona_id, periodo_id } = req.body;

  try {
    if (!persona_id || !periodo_id) {
      return res.status(400).json({ 
        error: "Se requiere persona_id y periodo_id" 
      });
    }

    // ✅ VERIFICAR QUE EXISTE LA MATRÍCULA
    const matriculaResult = await db.execute({
      sql: "SELECT id FROM matriculas WHERE persona_id = ? AND periodo_id = ?",
      args: [persona_id, periodo_id]
    });

    if (matriculaResult.rows.length === 0) {
      return res.status(404).json({ error: "Matrícula no encontrada" });
    }

    // ✅ ELIMINAR MATRÍCULA
    await db.execute({
      sql: "DELETE FROM matriculas WHERE persona_id = ? AND periodo_id = ?",
      args: [persona_id, periodo_id]
    });

    // ✅ RESETEAR FLAG
    await db.execute({
      sql: "UPDATE personas SET matricula_aceptada = 0 WHERE id = ?",
      args: [persona_id]
    });

    res.json({
      success: true,
      message: "✅ Matrícula rechazada"
    });

  } catch (error) {
    console.error('❌ Error rechazando matrícula:', error);
    res.status(500).json({ error: "Error al rechazar matrícula" });
  }
};

// ============================================
// 4. OBTENER MATRÍCULAS DEL ESTUDIANTE
// ============================================
export const obtenerMatriculasDelEstudiante = async (req: Request, res: Response) => {
  const { persona_id } = req.params;

  try {
    const result = await db.execute({
      sql: `SELECT 
        m.id, 
        m.persona_id, 
        m.periodo_id, 
        m.estado, 
        m.fecha_aceptacion,
        p.nombre as periodo_nombre, 
        p.fecha_inicio, 
        p.fecha_fin
      FROM matriculas m
      JOIN periodos p ON m.periodo_id = p.id
      WHERE m.persona_id = ?
      ORDER BY m.fecha_aceptacion DESC`,
      args: [persona_id]
    });

    res.json({
      success: true,
      matriculas: result.rows
    });

  } catch (error) {
    console.error('❌ Error obteniendo matrículas:', error);
    res.status(500).json({ error: "Error al obtener matrículas" });
  }
};