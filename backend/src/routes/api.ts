import { Router } from 'express';
import { 
  login, 
  registrar, 
  obtenerPersonas, 
  eliminarPersona, 
  actualizarPersona, 
  cambiarPassword,
  obtenerVectoresFaciales,
  buscarPorRFID,
  obtenerNotificaciones,      // <--- IMPORTAR
  marcarNotificacionesLeidas  // <--- IMPORTAR
} from '../controllers/userController';

import { 
  registrarAcceso, 
  obtenerUltimosAccesos, 
  obtenerHistorialCompleto, 
  borrarHistorial,
  verificarAccesoPorRFID,
  validarRFID,
  obtenerEstadisticas,
  obtenerGraficos
} from '../controllers/accesoController';

import visitantesRoutes from './visitantes';
import matriculasRoutes from './matriculas';

const router = Router();

// USUARIOS
router.post('/login', login);
router.post('/registrar', registrar);
router.get('/personas', obtenerPersonas);
router.delete('/personas/:id', eliminarPersona);
router.put('/personas/:id', actualizarPersona);
router.post('/cambiar-pass', cambiarPassword);
router.get('/vectores-faciales', obtenerVectoresFaciales);
router.get('/rfid/:rfid_code', buscarPorRFID);

// NOTIFICACIONES (CAMPANITA)
router.get('/notificaciones/:id', obtenerNotificaciones);
router.put('/notificaciones/leer/:id', marcarNotificacionesLeidas);

// MATRÍCULAS
router.use('/matriculas', matriculasRoutes);

// ACCESOS
router.post('/acceso', registrarAcceso);
router.get('/acceso/ultimos', obtenerUltimosAccesos);
router.get('/acceso/historial', obtenerHistorialCompleto);
router.delete('/acceso/historial', borrarHistorial);
router.post('/acceso/validar-rfid', validarRFID); // RFID Principal
router.post('/acceso/rfid', verificarAccesoPorRFID);
router.get('/acceso/estadisticas', obtenerEstadisticas);
router.get('/acceso/graficos', obtenerGraficos);
router.get('/dashboard/stats', obtenerGraficos);

// VISITANTES
router.use('/visitantes', visitantesRoutes);

export default router;