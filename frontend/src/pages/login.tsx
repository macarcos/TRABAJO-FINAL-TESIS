import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, User, LogIn, GraduationCap, Briefcase, Settings, Shield, ArrowLeft, School, AlertCircle } from 'lucide-react';

export default function Login() {
  const [paso, setPaso] = useState(1);
  const [rolSeleccionado, setRolSeleccionado] = useState<'Estudiante' | 'Docente' | 'Administrativo' | 'Admin' | 'Visitante' | null>(null);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleSeleccionarRol = (rol: 'Estudiante' | 'Docente' | 'Administrativo' | 'Admin' | 'Visitante') => {
    if (rol === 'Visitante') {
      navigate('/solicitar-acceso');
    } else {
      setRolSeleccionado(rol);
      setPaso(2);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = await axios.post('http://localhost:3000/api/login', { usuario, password });

      if (!res.data.auth) {
        setError(res.data.message || 'Credenciales incorrectas.');
        setCargando(false);
        return;
      }

      const userData = res.data.user;

      if (!userData.tipo_persona) {
        setError('Error del servidor. Contacta soporte.');
        setCargando(false);
        return;
      }

      if (userData.tipo_persona !== rolSeleccionado) {
        setError(`❌ Este usuario es ${userData.tipo_persona}, pero seleccionaste ${rolSeleccionado}`);
        setCargando(false);
        return;
      }

      sessionStorage.setItem('usuario_unemi', JSON.stringify(userData));

      if (userData.needs_password_reset === true || userData.needs_password_reset === 1) {
        navigate('/cambiar-password');
      } else if (userData.tipo_persona === 'Admin') {
        navigate('/dashboard');
      } else if (['Estudiante', 'Docente', 'Administrativo'].includes(userData.tipo_persona)) {
        navigate('/ecampus');
      } else {
        setError('Rol de usuario no reconocido.');
      }

    } catch (err: any) {
      const mensajeError = err.response?.data?.error || err.message || 'Error de conexión';
      setError(mensajeError);
    } finally {
      setCargando(false);
    }
  };

  const volver = () => {
    setPaso(1);
    setRolSeleccionado(null);
    setUsuario('');
    setPassword('');
    setError('');
  };

  // 🔥 COMPONENTE DE TARJETA DE ROL CON ESTILO UNIFICADO
  const RoleCard = ({ 
    icon: Icon, title, desc, role, colorClass 
  }: { 
    icon: any, title: string, desc: string, role: any, colorClass: string 
  }) => (
    <div 
      onClick={() => handleSeleccionarRol(role)}
      className={`group bg-white border border-gray-100 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-lg relative overflow-hidden transform hover:-translate-y-1 shadow-md`}
    >
      {/* Línea superior dinámica */}
      <div className={`absolute top-0 left-0 w-full h-1 ${colorClass} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
      
      <div className="flex flex-col items-center text-center space-y-3">
        <div className={`p-3 rounded-full bg-gray-50 group-hover:bg-opacity-20 transition-colors ${colorClass.replace('bg-', 'text-')}`}>
          <Icon size={28} strokeWidth={1.5} />
        </div>
        
        <div>
          <h3 className="text-base font-bold text-gray-800 group-hover:text-blue-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
        </div>

        <button className={`mt-2 px-4 py-1.5 rounded-full text-xs font-bold text-white opacity-0 group-hover:opacity-100 transform group-hover:translate-y-0 transition-all duration-300 ${colorClass}`}>
          Ingresar
        </button>
      </div>
    </div>
  );

  return (
    // CONTENEDOR PRINCIPAL CON EL FONDO REESTABLECIDO
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
      
      {/* ✅ FONDO IMAGEN (Reestablecido) */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
      {/* ✅ GRADIENTE AZUL (Themed) */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-blue-900/70"></div>

      <div className="relative w-full max-w-5xl px-4 z-10">
        
        {paso === 1 && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              {/* TÍTULO INSTITUCIONAL */}
              <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full shadow-md mb-3 border border-blue-100">
                <School className="text-blue-900" size={24} />
                <h1 className="text-xl font-extrabold text-blue-900 tracking-tight">
                  UniAccess
                </h1>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">Selecciona tu Perfil</h2>
              <p className="text-blue-200 text-sm">Elige tu rol para acceder a los servicios institucionales</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
              <RoleCard 
                icon={GraduationCap} title="Estudiante" desc="Acceso a matrícula, notas y control facial."
                role="Estudiante" colorClass="bg-blue-900" // Azul Navy
              />
              <RoleCard 
                icon={Briefcase} title="Docente" desc="Gestión académica y control de asistencia."
                role="Docente" colorClass="bg-orange-500" // Naranja
              />
              <RoleCard 
                icon={User} title="Administrativo" desc="Gestión interna y servicios al personal."
                role="Administrativo" colorClass="bg-emerald-600" // Verde/Esmeralda
              />
              <RoleCard 
                icon={Settings} title="Admin" desc="Configuración y mantenimiento del sistema."
                role="Admin" colorClass="bg-red-600" // Rojo/Alerta
              />
              <RoleCard 
                icon={Shield} title="Visitante" desc="Solicitud de acceso temporal al campus."
                role="Visitante" colorClass="bg-gray-500" // Gris Neutro
              />
            </div>
            
            <div className="text-center mt-8">
              <p className="text-blue-300 text-xs">© 2025 UniAccess</p>
            </div>
          </div>
        )}

        {paso === 2 && rolSeleccionado && (
          <div className="max-w-sm mx-auto animate-fade-in-up">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
              
              {/* HEADER DE LOGIN AZUL NAVY */}
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-5 text-center relative">
                <button 
                  onClick={volver}
                  className="absolute top-3 left-3 text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg text-blue-900">
                  <Lock size={20} />
                </div>
                <h2 className="text-lg font-bold text-white">Iniciar Sesión</h2>
                <p className="text-blue-100 text-xs mt-0.5 uppercase tracking-wider font-semibold">
                  Perfil: {rolSeleccionado}
                </p>
              </div>

              <div className="p-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-xs flex items-start gap-2 animate-shake">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 ml-1">Usuario</label>
                    <div className="relative group">
                      <User className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                      <input
                        type="text"
                        placeholder="Ingresa tu usuario"
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 ml-1">Contraseña</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={cargando}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {cargando ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Validando...
                      </span>
                    ) : (
                      <>
                        <LogIn size={18} /> Ingresar
                      </>
                    )}
                  </button>
                </form>
              </div>
              
              <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
                <p className="text-[10px] text-gray-500">¿Olvidaste tu contraseña? Contacta a soporte.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}