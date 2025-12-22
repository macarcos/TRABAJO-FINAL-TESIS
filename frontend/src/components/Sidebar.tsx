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
  History,
  Usb,
  FileCheck,
  UserX
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
    { icon: History, label: 'Historial de Accesos', path: '/dashboard/historial' },
    { icon: Usb, label: 'Conexión Arduino', path: '/dashboard/arduino' },
    
    // ✅ NUEVAS OPCIONES
    { icon: FileCheck, label: 'Solicitudes Visitantes', path: '/dashboard/visitantes' },
  
    
    { icon: FileText, label: 'Reportes', path: '/dashboard/reportes' },
    { icon: User, label: 'Mi Perfil', path: '/dashboard/perfil' },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('usuario_unemi');
    navigate('/');
  };

  return (
    // CAMBIO COLOR: De bg-unemi-primary (morado) a Azul Profundo estilo eCampus + Borde Naranja Superior
    <div className="w-56 bg-gradient-to-b from-blue-900 to-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col shadow-2xl z-50 border-t-4 border-orange-500">
      
      {/* HEADER */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-white/10 shrink-0">
        <div className="bg-white p-1 rounded-md shadow-md flex items-center justify-center">
          <img 
            src="https://sga.unemi.edu.ec/media/fotos/2021/03/17/logo_unemi.png" 
            alt="Logo UNEMI" 
            className="w-6 h-6 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
        
        <div className="flex flex-col">
          <h1 className="text-sm font-bold tracking-wide leading-tight text-white">UNI</h1>
          {/* CAMBIO COLOR: Subtítulo Naranja para resaltar */}
          <span className="text-[10px] text-orange-400 font-bold tracking-widest uppercase">Access</span>
        </div>
      </div>
      
      {/* NAVEGACIÓN */}
      <nav className="flex-1 mt-2 px-2 space-y-0.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              // CAMBIO COLOR ACTIVO: 
              // Antes: bg-white text-unemi-primary (Morado)
              // Ahora: bg-white text-blue-900 (Azul)
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200 group
                ${isActive 
                  ? 'bg-white text-blue-900 font-bold shadow-md transform translate-x-1' 
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
            >
              {/* CAMBIO COLOR ICONO: Activo se vuelve Naranja (estilo eCampus) */}
              <item.icon size={16} className={isActive ? 'text-orange-500' : 'text-white/70 group-hover:text-white'} />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* BOTÓN SALIR */}
      <div className="p-2 border-t border-white/10 bg-black/20 shrink-0">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-red-200 hover:bg-red-600 hover:text-white rounded-lg transition-colors font-medium text-xs"
        >
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}