import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import DashboardLayout from './layouts/DashboardLayout';
import ListaPersonas from './pages/ListaPersonas';
import RegistroPersonas from './pages/RegistroPersonas';
import GestionAdmins from './pages/GestionAdmins';
import ForzarCambioPassword from './pages/ForzarCambioPassword';
import ControlAcceso from './pages/ControlAcceso';
import ListaAccesos from './pages/ListaAccesos';
import Dashboard from './pages/Dashboard';
import Reportes from './pages/Reportes';
import MiPerfil from './pages/MiPerfil';
import SolicitudVisitante from './pages/SolicitudVisitantes';
import PanelVisitantes from './pages/PanelVisitantes';
import ECampus from './pages/ECampus';
import ConexionArduino from './pages/ConexionArduino';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cambiar-password" element={<ForzarCambioPassword />} />
        <Route path="/ecampus" element={<ECampus />} />

        {/* RUTAS PÚBLICAS */}
        <Route path="/solicitar-acceso" element={<SolicitudVisitante />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>

          {/* RUTA PRINCIPAL (DASHBOARD) */}
          <Route index element={<Dashboard />} />

          {/* VISITANTES */}
          <Route path="visitantes" element={<PanelVisitantes />} />
          <Route path="panel-visitantes" element={<PanelVisitantes />} />

          {/* PERSONAS Y ACCESO */}
          <Route path="lista" element={<ListaPersonas />} />
          <Route path="registro" element={<RegistroPersonas />} />
          <Route path="admins" element={<GestionAdmins />} />
          <Route path="acceso" element={<ControlAcceso />} />
          <Route path="historial" element={<ListaAccesos />} />
          
          {/* ARDUINO Y OTROS */}
          <Route path="arduino" element={<ConexionArduino />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="perfil" element={<MiPerfil />} />

        </Route>
        
        {/* Ruta comodín - redirige a inicio si no existe */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;