import { Router } from 'express';
import {
  crearSolicitudVisitante,
  obtenerSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud
} from '../controllers/visitanteController';

const router = Router();

// Rutas públicas (sin autenticación)
router.post('/solicitar', crearSolicitudVisitante);

// Rutas protegidas (solo admin - deberías agregar middleware de auth si lo deseas)
router.get('/', obtenerSolicitudes);
router.put('/:id/aprobar', aprobarSolicitud);
router.put('/:id/rechazar', rechazarSolicitud);

export default router;