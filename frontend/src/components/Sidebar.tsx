import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserPlus, 
  ShieldCheck, 
  Users, 
  FileText, 
  User, 
  LogOut,
  UserCog,
  History // <--- Agregué este icono para que se vea diferente a Reportes
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Lista de Personas', path: '/dashboard/lista' },
    { icon: UserPlus, label: 'Registro Personas', path: '/dashboard/registro' },
    { icon: UserCog, label: 'Gestión Admins', path: '/dashboard/admins' },
    { icon: ShieldCheck, label: 'Control de Acceso', path: '/dashboard/acceso' },
    
    // 👇👇👇 AQUÍ ESTÁ LA NUEVA OPCIÓN AGREGADA 👇👇👇
    { icon: History, label: 'Historial de Accesos', path: '/dashboard/historial' },
    // --------------------------------------------------

    { icon: FileText, label: 'Reportes', path: '/dashboard/reportes' },
    { icon: User, label: 'Mi Perfil', path: '/dashboard/perfil' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('usuario_unemi');
    navigate('/');
  };

  return (
    <div className="w-64 bg-unemi-primary text-white h-screen fixed left-0 top-0 flex flex-col shadow-2xl z-50">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-white/10">
        <div className="bg-white p-2 rounded-lg text-unemi-primary font-bold shadow-md">UA</div>
        <h1 className="text-xl font-bold tracking-wide">Uniacces</h1>
      </div>
      
      {/* Navegación */}
      <nav className="flex-1 mt-6 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-white text-unemi-primary font-bold shadow-lg' 
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
            >
              <item.icon size={20} className={isActive ? 'text-unemi-primary' : 'text-white/70 group-hover:text-white'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Botón Salir */}
      <div className="p-4 border-t border-white/10 bg-unemi-secondary/30">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-100 hover:bg-red-500 hover:text-white rounded-xl transition-colors font-medium"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}