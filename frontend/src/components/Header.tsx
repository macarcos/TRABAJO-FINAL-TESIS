import { useState, useEffect } from 'react';
import { Bell, LogOut, User, ChevronDown, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export default function Header() {
  const navigate = useNavigate();
  
  // ESTADOS DE MENÚ
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);
  const [menuNotifAbierto, setMenuNotifAbierto] = useState(false);
  
  // ESTADOS DE NOTIFICACIONES
  const [notificaciones, setNotificaciones] = useState<any[]>([]); 
  const [sinLeer, setSinLeer] = useState(0);

  // DATOS DE USUARIO
  const usuarioData = sessionStorage.getItem('usuario_unemi');
  const usuario = usuarioData 
    ? JSON.parse(usuarioData) 
    : { id: 0, nombre: 'Invitado', usuario: '---', rol: '---', iniciales: 'UA' };

  const nombreMostrar = usuario.nombre || usuario.usuario || "Usuario";

  // ==========================================
  // 🔄 CARGAR NOTIFICACIONES (POLLING 5s)
  // ==========================================
  useEffect(() => {
    if (usuario.id) {
        cargarNotificaciones();
        const intervalo = setInterval(cargarNotificaciones, 5000);
        return () => clearInterval(intervalo);
    }
  }, []);

  const cargarNotificaciones = async () => {
    try {
        const res = await axios.get(`${API_URL}/notificaciones/${usuario.id}`);
        if (res.data) {
            setNotificaciones(res.data);
            const count = res.data.filter((n: any) => !n.leida).length;
            setSinLeer(count);
        }
    } catch (e) {}
  };

  const toggleNotificaciones = async () => {
    if (!menuNotifAbierto) {
        setMenuNotifAbierto(true);
        setMenuPerfilAbierto(false);
        
        if (sinLeer > 0) {
            try {
                await axios.put(`${API_URL}/notificaciones/leer/${usuario.id}`);
                setSinLeer(0);
                // Marcamos localmente como leídas
                setNotificaciones(prev => prev.map(n => ({ ...n, leida: 1 })));
            } catch(e) {}
        }
    } else {
        setMenuNotifAbierto(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('usuario_unemi');
    navigate('/');
  };

  return (
    <div className="h-16 bg-white shadow-sm flex items-center justify-end px-5 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        
        {/* ========================================== */}
        {/* 🔔 CAMPANITA INTELIGENTE */}
        {/* ========================================== */}
        <div className="relative">
            <button 
                onClick={toggleNotificaciones}
                className="relative cursor-pointer hover:bg-gray-50 p-2 rounded-full transition-colors outline-none"
            >
                {/* Icono Naranja cuando está activo */}
                <Bell size={20} className={`transition-colors ${menuNotifAbierto ? 'text-orange-500' : 'text-gray-500'}`} />
                {sinLeer > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                        {sinLeer}
                    </span>
                )}
            </button>

            {/* DROPDOWN DE NOTIFICACIONES */}
            {menuNotifAbierto && (
                <div className="absolute right-0 top-full mt-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in-up z-50 origin-top-right">
                    {/* Encabezado Azul degradado */}
                    <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-3 flex justify-between items-center text-white shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">Notificaciones</span>
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">{notificaciones.length}</span>
                        </div>
                        {/* 🗑️ BOTÓN DE LIMPIAR ELIMINADO */}
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto bg-gray-50">
                        {notificaciones.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center">
                                <Bell size={32} className="mb-2 opacity-20"/>
                                <p>No tienes notificaciones</p>
                            </div>
                        ) : (
                            notificaciones.map((n) => (
                                <div key={n.id} className={`p-4 border-b hover:bg-white transition-colors relative ${!n.leida ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            {n.titulo.includes("Eliminado") || n.titulo.includes("borrado") ? (
                                                <AlertCircle size={14} className="text-red-500"/> 
                                            ) : n.titulo.includes("Actualización") ? (
                                                <Info size={14} className="text-blue-500"/>
                                            ) : (
                                                <CheckCircle2 size={14} className="text-green-500"/>
                                            )}
                                            <h4 className={`text-xs font-bold ${!n.leida ? 'text-blue-800' : 'text-gray-700'}`}>
                                                {n.titulo}
                                            </h4>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-snug mb-2 ml-6">{n.mensaje}</p>
                                    <p className="text-[10px] text-gray-400 text-right">
                                        {new Date(n.fecha).toLocaleString()}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Separador Vertical */}
        <div className="h-6 w-px bg-gray-200"></div>

        {/* ========================================== */}
        {/* 👤 PERFIL */}
        {/* ========================================== */}
        <div className="relative">
          <button 
            onClick={() => { setMenuPerfilAbierto(!menuPerfilAbierto); setMenuNotifAbierto(false); }}
            className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded-xl transition-all outline-none"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-700 leading-tight">{nombreMostrar}</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider text-right">{usuario.rol}</p>
            </div>
            <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-white font-bold shadow-md ring-2 ring-offset-2 ring-orange-500 text-xs">
              {usuario.iniciales || 'UA'}
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${menuPerfilAbierto ? 'rotate-180' : ''}`} />
          </button>

          {/* MENÚ DE PERFIL */}
          {menuPerfilAbierto && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 animate-fade-in-down z-50">
              <div className="px-4 py-2 border-b border-gray-50 mb-2">
                <p className="text-xs text-gray-400 font-bold uppercase">Cuenta</p>
              </div>

              <Link to="/dashboard/perfil" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors" onClick={() => setMenuPerfilAbierto(false)}>
                <User size={16} /><span>Mi Perfil</span>
              </Link>

              <div className="my-2 border-t border-gray-50"></div>

              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 transition-colors text-left font-medium">
                <LogOut size={16} /><span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}