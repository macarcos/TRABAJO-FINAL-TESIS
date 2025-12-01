import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function DashboardLayout() {
  // Protección: Si no está logueado, lo mandamos al login
  const isAuthenticated = localStorage.getItem('usuario_unemi');

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex bg-unemi-bg min-h-screen font-sans">
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