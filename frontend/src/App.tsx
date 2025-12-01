import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import DashboardLayout from './layouts/DashboardLayout';
import ListaPersonas from './pages/ListaPersonas';
import RegistroPersonas from './pages/RegistroPersonas';
import GestionAdmins from './pages/GestionAdmins';
import ForzarCambioPassword from './pages/ForzarCambioPassword';
import ControlAcceso from './pages/ControlAcceso';
import ListaAccesos from './pages/ListaAccesos';
// IMPORTAMOS LOS NUEVOS ARCHIVOS
import Dashboard from './pages/Dashboard';
import Reportes from './pages/Reportes';
import MiPerfil from './pages/MiPerfil';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cambiar-password" element={<ForzarCambioPassword />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
          
          {/* RUTA PRINCIPAL (DASHBOARD) */}
          <Route index element={<Dashboard />} />

          <Route path="lista" element={<ListaPersonas />} />
          <Route path="registro" element={<RegistroPersonas />} />
          <Route path="admins" element={<GestionAdmins />} />
          <Route path="acceso" element={<ControlAcceso />} />
          <Route path="historial" element={<ListaAccesos />} />
          
          {/* RUTAS NUEVAS CONECTADAS */}
          <Route path="reportes" element={<Reportes />} />
          <Route path="perfil" element={<MiPerfil />} />

        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;