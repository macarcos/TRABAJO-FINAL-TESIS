import { Router } from 'express';
import { 
  login, 
  registrar, 
  obtenerPersonas, 
  eliminarPersona, 
  actualizarPersona, 
  cambiarPassword,
  obtenerVectoresFaciales,  // ✅ NUEVO
  buscarPorRFID              // ✅ NUEVO
} from '../controllers/userController';

import { 
  registrarAcceso, 
  obtenerUltimosAccesos, 
  obtenerHistorialCompleto, 
  borrarHistorial,
  verificarAccesoPorRFID,    // ✅ NUEVO
  obtenerEstadisticas,        // ✅ NUEVO
  obtenerGraficos 
} from '../controllers/accesoController';

const router = Router();

// Rutas de Usuarios
router.post('/login', login);
router.post('/registrar', registrar);
router.get('/personas', obtenerPersonas);
router.delete('/personas/:id', eliminarPersona);
router.put('/personas/:id', actualizarPersona);
router.post('/cambiar-pass', cambiarPassword);

// ✅ NUEVAS RUTAS PARA RECONOCIMIENTO
router.get('/vectores-faciales', obtenerVectoresFaciales);  // Para comparación facial
router.get('/rfid/:rfid_code', buscarPorRFID);              // Buscar por RFID

// Rutas de Accesos
router.post('/acceso', registrarAcceso);
router.get('/acceso/ultimos', obtenerUltimosAccesos);
router.get('/acceso/historial', obtenerHistorialCompleto);
router.delete('/acceso/historial', borrarHistorial);

// ✅ NUEVAS RUTAS DE ACCESO
router.post('/acceso/rfid', verificarAccesoPorRFID);        // Verificar RFID desde Arduino
router.get('/acceso/estadisticas', obtenerEstadisticas);    // Estadísticas
router.get('/dashboard/stats', obtenerGraficos );
export default router;