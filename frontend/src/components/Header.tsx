import { useState } from 'react';
import { Bell, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Recuperamos los datos guardados en el Login
  const usuarioData = localStorage.getItem('usuario_unemi');
  const usuario = usuarioData 
    ? JSON.parse(usuarioData) 
    : { nombre: 'Invitado', usuario: '---', rol: '---', iniciales: 'UA' };

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('usuario_unemi');
    navigate('/');
  };

  // Decidimos qué nombre mostrar: Preferimos el nombre completo, si no, el usuario
  const nombreMostrar = usuario.nombre || usuario.usuario || "Usuario";

  return (
    <div className="h-20 bg-white shadow-sm flex items-center justify-end px-8 sticky top-0 z-40">
      <div className="flex items-center gap-6">
        
        {/* Notificaciones (Decorativo) */}
        <div className="relative cursor-pointer hover:bg-gray-50 p-2 rounded-full transition-colors">
          <Bell size={20} className="text-gray-500" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </div>

        {/* Separador Vertical */}
        <div className="h-8 w-px bg-gray-200"></div>

        {/* ZONA DE PERFIL (Con Menú Desplegable) */}
        <div className="relative">
          
          {/* Botón que abre el menú */}
          <button 
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition-all outline-none"
          >
            <div className="text-right hidden sm:block">
              {/* AQUÍ CAMBIAMOS: Mostramos el Nombre en lugar de "ADMIN" */}
              <p className="text-sm font-bold text-unemi-text leading-tight">{nombreMostrar}</p>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider text-right">{usuario.rol}</p>
            </div>
            
            {/* Círculo con Iniciales */}
            <div className="w-10 h-10 bg-unemi-primary rounded-full flex items-center justify-center text-white font-bold shadow-md shadow-unemi-primary/30 ring-2 ring-offset-2 ring-unemi-primary">
              {usuario.iniciales || 'UA'}
            </div>

            {/* Flechita pequeña */}
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${menuAbierto ? 'rotate-180' : ''}`} />
          </button>

          {/* EL MENÚ DESPLEGABLE (Dropdown) */}
          {menuAbierto && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 animate-fade-in-down">
              
              <div className="px-4 py-2 border-b border-gray-50 mb-2">
                <p className="text-xs text-gray-400 font-bold uppercase">Cuenta</p>
              </div>

              <Link 
                to="/dashboard/perfil" 
                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-unemi-primary transition-colors"
                onClick={() => setMenuAbierto(false)}
              >
                <User size={18} />
                <span>Mi Perfil</span>
              </Link>

              <button 
                className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-unemi-primary transition-colors text-left"
                onClick={() => setMenuAbierto(false)} // Aquí iría a configuración real
              >
                <Settings size={18} />
                <span>Configuración</span>
              </button>

              <div className="my-2 border-t border-gray-50"></div>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 transition-colors text-left font-medium"
              >
                <LogOut size={18} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}