import { Router } from 'express';
import {
  crearSolicitudVisitante,
  obtenerSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
  corregirDecision,
  eliminarSolicitudes,
  eliminarSolicitudIndividual // <--- 1. AGREGA ESTA IMPORTACIÓN
} from '../controllers/visitanteController';

const router = Router();

// Rutas públicas
router.post('/solicitar', crearSolicitudVisitante);

// Rutas protegidas (solo admin)
router.get('/', obtenerSolicitudes);
router.put('/:id/aprobar', aprobarSolicitud);
router.put('/:id/rechazar', rechazarSolicitud);
router.put('/:id/corregir', corregirDecision);

// Rutas de eliminación
router.post('/eliminar', eliminarSolicitudes);      // Masivo
router.delete('/:id', eliminarSolicitudIndividual); // <--- 2. AGREGA ESTA RUTA NUEVA

export default router;