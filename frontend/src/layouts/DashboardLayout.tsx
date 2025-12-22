import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function DashboardLayout() {
  // 🔥 CAMBIO CLAVE: sessionStorage para verificar sesión por pestaña
  const isAuthenticated = sessionStorage.getItem('usuario_unemi');

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex bg-gray-50 min-h-screen font-sans">
      {/* Menú Fijo a la Izquierda */}
      <Sidebar />

      {/* Contenido Principal a la Derecha */}
      <div className="flex-1 ml-64 flex flex-col">
        <Header />
        
        {/* Aquí se cargarán las páginas internas (Dashboard, Registro, etc.) */}
        <main className="p-8 flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}