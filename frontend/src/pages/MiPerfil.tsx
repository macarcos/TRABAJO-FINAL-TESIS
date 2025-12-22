import { useState } from 'react';
import axios from 'axios';
import { User, Lock, Save, ShieldCheck, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function MiPerfil() {
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  
  // ESTADOS DE NOTIFICACIÓN TOAST
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [showToast, setShowToast] = useState(false);

  const usuarioData = sessionStorage.getItem('usuario_unemi');
  
  const usuario = usuarioData ? JSON.parse(usuarioData) : {
    nombre: 'Usuario Desconocido',
    usuario: '---',
    rol: 'Invitado',
    iniciales: 'UA'
  };
  
  const lanzarToast = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setShowToast(true), 10);
    setTimeout(() => {
        setShowToast(false);
        setTimeout(() => setMensaje({ tipo: '', texto: '' }), 500);
    }, 3000);
  };

  const handleCambioPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass1 !== pass2) return lanzarToast("error", "Las contraseñas no coinciden");
    if (pass1.length < 6) return lanzarToast("error", "La contraseña debe tener al menos 6 caracteres");

    try {
      await axios.post('http://localhost:3000/api/cambiar-pass', {
        usuario_id: usuario.id,
        nueva_password: pass1
      });
      lanzarToast("success", "Contraseña actualizada correctamente");
      setPass1(''); setPass2('');
    } catch (e) { 
        lanzarToast("error", "Error al actualizar la contraseña"); 
    }
  };

  return (
    // CAMBIO: Aumentamos el ancho máximo a 5xl
    <div className="max-w-5xl mx-auto space-y-6 p-4">

      {/* TOAST NOTIFICACIÓN */}
      {mensaje.texto && (
        <div 
            className={`fixed top-20 right-4 z-50 shadow-xl rounded-lg p-3 w-72 border-l-4 flex items-center justify-between gap-3 bg-white 
            transition-all duration-500 ease-in-out transform 
            ${showToast ? 'translate-x-0 opacity-100' : 'translate-x-[150%] opacity-0'}
            ${mensaje.tipo === 'success' ? 'border-green-500 text-gray-800' : 'border-red-500 text-gray-800'}`}
        >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-full ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {mensaje.tipo === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
              </div>
              <div>
                <h4 className="font-bold text-xs">{mensaje.tipo === 'success' ? '¡Éxito!' : 'Error'}</h4>
                <p className="text-[11px] text-gray-600 leading-tight">{mensaje.texto}</p>
              </div>
            </div>
            <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
        </div>
      )}
      
      {/* TÍTULO GRANDE */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
          <User size={24} className="text-orange-500"/> Mi Perfil
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">Información de cuenta y seguridad.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* TARJETA DE INFO (Izquierda) */}
        <div className="md:col-span-1">
          {/* AUMENTAMOS EL PADDING Y AGREGAMOS BORDE */}
          <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 text-center h-full border-t-4 border-orange-500">
            {/* AUMENTAMOS TAMAÑO DEL CÍRCULO */}
            <div className="w-24 h-24 bg-blue-900 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-md">
              {usuario.iniciales || 'UA'}
            </div>
            
            {/* AUMENTAMOS TAMAÑO DEL NOMBRE */}
            <h3 className="text-xl font-bold text-gray-800">{usuario.nombre}</h3>
            <p className="text-sm text-gray-400 font-mono mt-0.5">@{usuario.usuario}</p>
            
            <div className="mt-5 pt-5 border-t border-gray-100">
              <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-xs font-bold border border-orange-100 uppercase tracking-wide">
                <ShieldCheck size={14}/> {usuario.rol}
              </span>
            </div>
          </div>
        </div>

        {/* FORMULARIO (Derecha) */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 border-t-4 border-orange-500">
            <h3 className="font-bold text-blue-900 mb-5 flex items-center gap-2 text-base">
              <Lock size={18} className="text-orange-500"/> Cambiar Contraseña
            </h3>
            
            <form onSubmit={handleCambioPass} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={pass1} 
                  onChange={e=>setPass1(e.target.value)} 
                  // Input más alto
                  className="w-full px-4 py-3 text-base border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-400"
                  placeholder="••••••••"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Confirmar Contraseña</label>
                <input 
                  type="password" 
                  value={pass2} 
                  onChange={e=>setPass2(e.target.value)} 
                  // Input más alto
                  className="w-full px-4 py-3 text-base border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-400"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-3 flex justify-end">
                {/* Botón más grande */}
                <button className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:shadow-lg transition-all shadow-md">
                  <Save size={18}/> Actualizar Clave
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}