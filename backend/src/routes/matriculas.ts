import { Router } from 'express';
import {
  obtenerPeriodsDisponibles,
  aceptarMatricula,
  rechazarMatricula,
  obtenerMatriculasDelEstudiante
} from '../controllers/matriculaController';

const router = Router();

// ========================================
// RUTAS DE MATRÍCULAS
// ========================================

// GET /api/matriculas/periodos - Obtener períodos disponibles
router.get('/periodos', obtenerPeriodsDisponibles);

// POST /api/matriculas/aceptar - Aceptar matrícula
router.post('/aceptar', aceptarMatricula);

// POST /api/matriculas/rechazar - Rechazar matrícula
router.post('/rechazar', rechazarMatricula);

// GET /api/matriculas/estudiante/:persona_id - Obtener matrículas del estudiante
router.get('/estudiante/:persona_id', obtenerMatriculasDelEstudiante);

export default router;